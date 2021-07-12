import { ListTypeNode } from 'graphql'
import {
  DocumentNode,
  NonNullTypeNode,
  OperationTypeNode,
  TypeNode,
  VariableDefinitionNode
} from 'graphql/language/ast'
import util from 'util'

import { ByteIterator, createIterator } from '../iterator'
import documentDecoder from './documentDecoder'
import {
  ASCII_OFFSET,
  Config,
  Context,
  Decoder,
  DecodeResult,
  DictionaryEntry,
  DictionaryListEntry,
  DictionaryListScalar,
  DictionaryListVector,
  DictionaryScalar,
  DictionaryVector,
  END,
  MIN_LENGTH,
  Operation
} from './index.d'
import jsonDecoder from './jsonDecoder'

function decode(dictionary: DictionaryVector, data: Uint8Array): DecodeResult {
  if (data.length < MIN_LENGTH)
    throw new Error(`Data packet is less than ${MIN_LENGTH} bytes`)

  const byteIterator = createIterator<number>(data, END)

  const operation = Operation[byteIterator.take()] as OperationTypeNode

  const selectionSet = decodeQueryVector(
    documentDecoder, // FIXME add context
    dictionary,
    byteIterator
  )
  const document: DocumentNode = {
    kind: 'Document',
    definitions: [
      {
        kind: 'OperationDefinition',
        operation: operation,
        selectionSet: selectionSet
      }
    ]
  }

  // Move to data
  byteIterator.take()

  return {
    document,
    variables: decodeValue(jsonDecoder, dataDictionary, byteIterator) // FIXME generate dataDictionary
  }
}

const { accumulate, commit } = variablesHandler()
accumulate('test', 'rest', true, [true, false, true]).commit()
console.log(util.inspect(commit(), { showHidden: false, depth: null }))

function variablesHandler() {
  // let currentVariable = ASCII_OFFSET
  const accumulator: Array<VariableDefinitionNode> = []
  return {
    accumulate: (
      key: string,
      typeName: string,
      isNonNull: boolean,
      listConfig: Array<boolean>
    ) => {
      let typeNode: TypeNode = {
        kind: 'NamedType',
        name: {
          kind: 'Name',
          value: typeName
        }
      }
      if (isNonNull) typeNode = envelopeInNonNull(typeNode)
      return {
        commit: () =>
          accumulator.push({
            kind: 'VariableDefinition',
            type: iterateOverVariableType(listConfig, typeNode),
            variable: {
              kind: 'Variable',
              name: {
                kind: 'Name',
                value: key
              }
            }
          })
      }
    },
    // accumulator.push({
    //   kind: 'VariableDefinition',
    //   type: {
    //     kind: 'NamedType',
    //     name: {
    //       kind: 'Name',
    //       value: type
    //     }
    //   },
    //   variable: {
    //     kind: 'Variable',
    //     name: {
    //       kind: 'Name',
    //       value: key
    //     }
    //   }
    // }),
    commit: () => accumulator
  }
}

function envelopeInNonNull(type: NonNullTypeNode['type']): NonNullTypeNode {
  return {
    kind: 'NonNullType',
    type: type
  }
}

function iterateOverVariableType(
  listConfig: Array<boolean>,
  acc: TypeNode,
  index: number = listConfig.length - 1
): TypeNode {
  if (index < 0) return acc
  let typeNode: TypeNode = { kind: 'ListType', type: acc }
  if (listConfig[index]) typeNode = envelopeInNonNull(typeNode)
  return iterateOverVariableType(listConfig, typeNode, index - 1)
}

function decodeQueryVector<Vector>(
  decoder: Decoder<Vector, any>,
  dictionary: DictionaryVector,
  data: ByteIterator<number>,
  currentVariable: number = ASCII_OFFSET
) {
  const { accumulate, commit } = decoder.vector()
  const fields = dictionary.fields

  while (!data.atEnd()) {
    const field: DictionaryEntry = fields[data.take()]
    const callbacks = accumulate(field.name)

    if (has(field.config, Config.HAS_ARGUMENTS))
      while (!data.atEnd()) {
        const arg = fields[data.current()]
        if (has(arg.config, Config.ARGUMENT)) {
          callbacks.addArg(
            fields[data.take()].name,
            String.fromCharCode(currentVariable)
          )
          currentVariable += 1
        } else break
      }

    if (has(field.config, Config.VECTOR))
      callbacks.addValue(
        decodeQueryVector(
          decoder,
          field as DictionaryVector,
          data,
          currentVariable
        )
      )

    callbacks.commit()
  }

  return commit()
}

function decodeValue<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryEntry,
  data: ByteIterator<number>
): any {
  // Important to check if LIST first
  if (has(dictionary.config, Config.LIST))
    return decodeList(decoder, dictionary as DictionaryListEntry, data)

  if (has(dictionary.config, Config.VECTOR))
    return decodeVector(decoder, dictionary as DictionaryVector, data)

  if (has(dictionary.config, Config.SCALAR))
    return (dictionary as DictionaryScalar<any>).handler.decode(data)
}

function decodeVector<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryVector,
  data: ByteIterator<number>
) {
  const vector = decoder.vector()

  while (!data.atEnd()) {
    const field: DictionaryEntry = dictionary.fields[data.take()]
    const { addValue } = vector.accumulate(field.name)
    addValue(decodeValue(decoder, field, data))
  }

  return vector.commit()
}

function decodeList<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryListEntry,
  data: ByteIterator<number>
) {
  const list = decoder.list()

  while (!data.atEnd())
    if (has(dictionary.config, Config.VECTOR))
      list.accumulate(
        decodeValue(decoder, (dictionary as DictionaryListVector).ofType, data)
      )
    else
      list.accumulate(
        (dictionary as DictionaryListScalar<any>).handler.decode(data)
      )

  data.take()

  return list.commit()
}

function has(bitmask: number, flag: Config) {
  return (bitmask & flag) === flag
}

const scalar: DictionaryScalar<string> = {
  name: 'scalarList',
  config: Config.LIST | Config.SCALAR,
  handler: {
    encode: (data: string) => new Uint8Array(new TextEncoder().encode(data)),
    decode: (data: ByteIterator<number>) => String.fromCharCode(data.take())
  }
}

const vector: DictionaryVector = {
  name: 'vector',
  config: Config.VECTOR,
  fields: [scalar]
}

vector.fields.push(vector)

const dataDictionary: DictionaryVector = {
  name: 'Arg',
  config: Config.VECTOR,
  fields: [
    scalar,
    {
      name: 'vectorList',
      config: Config.LIST | Config.VECTOR,
      ofType: vector,
      fields: []
    }
  ]
}

const queryDictionary: DictionaryVector = {
  name: 'Query',
  config: Config.VECTOR,
  fields: [
    {
      name: `scalar`,
      config: Config.SCALAR | Config.HAS_ARGUMENTS,
      handler: {
        encode: () => new Uint8Array(),
        decode: () => 'rest'
      }
    },
    {
      name: `arg`,
      config: Config.SCALAR | Config.ARGUMENT,
      handler: {
        encode: () => new Uint8Array(),
        decode: () => 'rest'
      }
    },
    {
      name: `arg2`,
      config: Config.SCALAR | Config.ARGUMENT,
      handler: {
        encode: () => new Uint8Array(),
        decode: () => 'rest'
      }
    },
    {
      name: 'vector',
      config: Config.VECTOR,
      fields: [
        {
          name: `scalar2`,
          config: Config.SCALAR,
          handler: {
            encode: () => new Uint8Array(),
            decode: () => 'rest'
          }
        }
      ]
    }
  ]
}

const query = new Uint8Array([
  Operation.mutation,
  0,
  1,
  2,
  3,
  0,
  END,
  // Variables start here
  0,
  1,
  2,
  3,
  4,
  END,
  1,
  0,
  1,
  END,
  1,
  0,
  1,
  END
])

const decodedQuery = decode(queryDictionary, query)
// console.log(util.inspect(decodedData, { showHidden: false, depth: null }))
console.log(util.inspect(decodedQuery, { showHidden: false, depth: null }))
