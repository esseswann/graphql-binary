import {
  DocumentNode,
  FieldNode,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNode
} from 'graphql'
import {
  // VariablesEncoder,
  EncodedQueryWithHandler,
  EncodeResult,
  END,
  Operation
} from './types'
import defaultScalarHandlers, { ScalarHandlers } from '../scalarHandlers'
import extractTargetType from './extractTargetType'

class Encoder {
  readonly schema: GraphQLSchema
  readonly scalarHandlers: ScalarHandlers

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
  }

  // FIXME not sure if making a default type argument value is a good idea
  encode<Result, Variables = void>(
    query: DocumentNode
  ): EncodeResult<Result, Variables> {
    const result = []
    const { definitions } = this.prepareDocument(query)
    const definition = definitions[0] as OperationDefinitionNode
    const operation = definition.operation
    result.push(Operation[operation])
    encodeQueryVector(
      this.schema,
      result,
      this.getOperationType(operation),
      definition.selectionSet
    )
    // const variablesEncoder = new VariablesEncoder<Result, Variables>()
    const data = 123
    const type = this.schema.getType('Int')
    if (type) encodeValue(this, type, data, new Uint8Array())
    return {
      query: new Uint8Array(result),
      handleResponse: () => ({} as Result)
    }
    // variablesEncoder.encodeVariables
    // (variables: Variables) => ({
    // })
  }

  private prepareDocument(query: DocumentNode) {
    return query
  }

  private getOperationType(operation: string): GraphQLObjectType {
    if (operation === 'query')
      return this.schema.getQueryType() as GraphQLObjectType
    else if (operation === 'mutation')
      return this.schema.getMutationType() as GraphQLObjectType
    else if (operation === 'subscription')
      return this.schema.getMutationType() as GraphQLObjectType
    else throw new Error(`Unsupported operation type ${operation}`)
  }
}

function encodeQueryVector(
  schema: GraphQLSchema,
  result: Array<number>,
  type: GraphQLObjectType,
  selectionSet: SelectionSetNode
): Array<number> {
  const fieldsArray = type.astNode?.fields || []
  for (let index = 0; index < selectionSet.selections.length; index++) {
    const selection = selectionSet.selections[index] as FieldNode
    const fieldIndex = fieldsArray.findIndex(
      ({ name }) => name.value === selection.name.value
    )
    result.push(fieldIndex)

    if (selection.arguments)
      for (let index = 0; index < selection.arguments.length; index++)
        result.push(fieldIndex + index + 1)

    if (selection.selectionSet) {
      const typeName = extractTargetType(fieldsArray[fieldIndex].type)
      const type = schema.getType(typeName) as GraphQLObjectType
      encodeQueryVector(schema, result, type, selection.selectionSet)
    }
  }
  result.push(END)
  return result
}

function encodeValue(
  encoder: Encoder,
  type: GraphQLNamedType,
  data: any,
  accumulator: Uint8Array
): Uint8Array {
  let result: Uint8Array = new Uint8Array([])

  const kind = type.astNode?.kind

  if (!kind && encoder.scalarHandlers[type.name]) {
    result = encoder.scalarHandlers[type.name].encode(data)
  } else if (kind === 'ScalarTypeDefinition' && encoder.scalarHandlers[kind]) {
    result = encoder.scalarHandlers[kind].encode(data)
  } else if (kind === 'InputObjectTypeDefinition') console.log('input object')
  else if (kind === 'EnumTypeDefinition') console.log('enum')
  else throw new Error(`Unknown or non-input type ${type.name} in a variable`)

  return mergeArrays(accumulator, result)
}

function encodeVector(
  encoder: Encoder,
  type: GraphQLObjectType,
  data: object
): Uint8Array {
  const fields = type.getFields()
  for (const key in data) {
    const definition = fields[key]
    console.log(definition)
  }
  return new Uint8Array()
}

function encodeList(
  encoder: Encoder,
  type: TypeNode,
  data: Array<any>
): Uint8Array {
  return new Uint8Array()
}

// class VariablesEncoder<Result, Variables> {
//   schema: GraphQLSchema
//   encodedQuery: Uint8Array
//   variablesBits: Array<Uint8Array>
//   variablesMap: Map<string, VariableConfig>

//   encodeVariables(data: Variables): EncodedQueryWithHandler<Result> {
//     const variableBits = [...this.variablesBits]
//     for (const property in data) {
//       // FIXME there are cases when people really want to use null
//       if (data[property] != null) {
//         const { typeName, index } = this.variablesMap.get(property)
//         // variableBits.splice(index, 0, this.encodeValue(data[property]))
//       }
//     }
//     return {
//       query: mergeArrays(this.encodedQuery, ...variableBits),
//       handleResponse: () => ({} as Result)
//     }
//   }

//   encodeValue(type: GraphQLType, data: any): Uint8Array {
//     if (data.hasOwnProperty('length')) console.log(data)
//     return new Uint8Array([])
//   }
// }

// type VariableConfig = {
//   typeName: string
//   index: number
// }

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
