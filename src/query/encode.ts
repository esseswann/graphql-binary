import { DocumentNode, GraphQLSchema } from 'graphql'
import defaultScalarHandlers, { ScalarHandlers } from '../scalarHandlers'

class Encoder {
  private readonly schema: GraphQLSchema
  private readonly scalarHandlers: ScalarHandlers

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
  }

  encode(query: DocumentNode): EncodeResult {
    const preparedNode = this.prepareDocument(query)
    return new Uint8Array([]) as EncodeResultOnlyQuery
  }

  prepareDocument(query: DocumentNode) {}
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

export default Encoder
