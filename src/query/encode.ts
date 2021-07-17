import {
  DocumentNode,
  FieldNode,
  GraphQLObjectType,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode
} from 'graphql'
import { END, Operation } from './index.d'
import defaultScalarHandlers, { ScalarHandlers } from '../scalarHandlers'
import extractTargetType from './extractTargetType'

class Encoder {
  private readonly schema: GraphQLSchema
  private readonly scalarHandlers: ScalarHandlers
  private result: Array<number>

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
  }

  getOperationType(operation: string) {
    const type = operation.charAt(0).toUpperCase() + operation.slice(1)
    return this.schema[`get${type}Type`]()
  }

  encode(query: DocumentNode): EncodeResult {
    this.result = []
    const { definitions } = this.prepareDocument(query)
    const definition = definitions[0] as OperationDefinitionNode
    const operation = definition.operation
    this.result.push(Operation[operation])
    const result = this.encodeVector(
      this.getOperationType(operation),
      definition.selectionSet
    )
    return new Uint8Array(result)
  }

  private prepareDocument(query: DocumentNode) {
    return query
  }

  private encodeVector(
    type: GraphQLObjectType,
    selectionSet: SelectionSetNode
  ): Array<number> {
    const fieldsArray = type.astNode.fields
    for (let index = 0; index < selectionSet.selections.length; index++) {
      const selection = selectionSet.selections[index] as FieldNode
      const fieldIndex = fieldsArray.findIndex(
        ({ name }) => name.value === selection.name.value
      )
      this.result.push(fieldIndex)
      // FIXME add arguments
      if (selection.selectionSet) {
        const typeName = extractTargetType(fieldsArray[fieldIndex].type)
        const type = this.schema.getType(typeName) as GraphQLObjectType
        this.encodeVector(type, selection.selectionSet)
      }
    }
    this.result.push(END)
    return this.result
  }
}

type EncodeResult = EncodeResultWithVariables | EncodeResultOnlyQuery
type EncodeResultWithVariables = (data: object) => Uint8Array
type EncodeResultOnlyQuery = Uint8Array

type EncodeVariables = (data: object) => Uint8Array

class EncoderWithVariables {
  encodedQuery: Uint8Array
  variablesBits: Array<Uint8Array>
  variablesMap: Map<string, VariableConfig>

  encode(data: object) {
    const variableBits = [...this.variablesBits]
    for (const property in data) {
      // FIXME there are cases when people really want to use null
      if (data[property] != null) {
        const { typeName, index } = this.variablesMap.get(property)
        variableBits.splice(index, 0, this.encodeValue(data[property]))
      }
    }
    return mergeArrays(this.encodedQuery, ...variableBits)
  }

  encodeValue(data: any): Uint8Array {
    return new Uint8Array([])
  }
}

type VariableConfig = {
  typeName: string
  index: number
}

// Somewhat efficient Uint8Array merging
function mergeArrays(...arrays: Uint8Array[]): Uint8Array {
  const myArray = new Uint8Array(arrays.reduce<number>(lengthsReducer, 0))
  for (let i = 0; i < arrays.length; i++)
    myArray.set(arrays[i], arrays[i - 1]?.length || 0)
  return myArray
}

function lengthsReducer(result: number, data: ArrayLike<any>) {
  return result + data.length
}

// [reference, config, stringLength, ...stringBody]

export default Encoder
