import {
  ArgumentNode,
  DocumentNode,
  FieldDefinitionNode,
  FieldNode,
  InputValueDefinitionNode,
  IntValueNode,
  SelectionSetNode,
  VariableNode,
  ListValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  ValueNode
} from 'graphql/language/ast'
import util from 'util'

import {
  ByteIterator,
  Config,
  Decoder,
  DictionaryEntry,
  DictionaryListEntry,
  DictionaryListScalar,
  DictionaryListVector,
  DictionaryScalar,
  DictionaryVector,
  END
} from './index.d'

// function decode(dictionary: DictionaryField, data: Uint8Array): DocumentNode {
//   if (data.length < MIN_LENGTH)
//     throw new Error(`Data packet is less than ${MIN_LENGTH} bytes`)

//   const byteIterator = createIterator(data)

//   const operation = Operation[byteIterator.next()] as OperationTypeNode

//   const context: Context = {
//     variables: generateVariblesContext(byteIterator)
//   }

//   const document: DocumentNode = {
//     kind: 'Document',
//     definitions: [
//       {
//         kind: 'OperationDefinition',
//         operation: operation,
//         selectionSet: {
//           kind: 'SelectionSet',
//           selections: decodeObjectType(
//             context,
//             dictionary.fields[0],
//             byteIterator
//           )
//         }
//       }
//     ]
//   }

//   return document
// }

// function generateVariblesContext(data: ByteIterator): Variables {
//   return new Map()
// }

// function decodeObjectType(
//   context: Context,
//   dictionary: DictionaryField,
//   data: ByteIterator
// ): ReadonlyArray<FieldNode> {
//   const fields: FieldNode[] = []

//   while (data.peek() !== END && data.peek() !== undefined)
//     fields.push(decodeField(context, dictionary, data))

//   return fields
// }

// function decodeField(
//   context: Context,
//   dictionary: DictionaryField,
//   data: ByteIterator
// ): FieldNode {
//   const field: DictionaryField = dictionary.fields[data.next()]

//   // Order is important because data is an iterator
//   const args =
//     field.config & Config.ARGUMENT && decodeArguments(context, field, data)

//   // Order is important because data is an iterator
//   const selections =
//     field.config & Config.VECTOR && decodeObjectType(context, field, data)

//   return {
//     kind: 'Field',
//     name: {
//       kind: 'Name',
//       value: field.name
//     },
//     ...(args && { arguments: args }),
//     ...(selections && {
//       selectionSet: {
//         kind: 'SelectionSet',
//         selections
//       }
//     })
//   }
// }

// function decodeArguments(
//   context: Context,
//   dictionary: DictionaryField,
//   data: ByteIterator
// ): ReadonlyArray<ArgumentNode> {
//   const args: ArgumentNode[] = []

//   // FIXME first argument is not handeled
//   while (dictionary.fields[data.peek()].config & Config.ARGUMENT)
//     args.push(decodeArgument(context, dictionary, data))

//   return args
// }

// function decodeArgument(
//   context: Context,
//   dictionary: DictionaryField,
//   data: ByteIterator
// ): ArgumentNode {
//   const variable = context.variables.get(data.index)
//   const arg = dictionary.fields[data.next()]
//   return {
//     kind: 'Argument',
//     name: {
//       kind: 'Name',
//       value: arg.name
//     },
//     value: {
//       kind: 'IntValue',
//       value: 'test'
//     }
//   }
// }

function decodeValue<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryEntry,
  data: ByteIterator
): any {
  // Important to check if LIST first
  if ((dictionary.config & Config.LIST) === Config.LIST) {
    return decodeList(decoder, dictionary as DictionaryListEntry, data)
  }

  if ((dictionary.config & Config.VECTOR) === Config.VECTOR) {
    return decodeVector(decoder, dictionary as DictionaryVector, data)
  }

  if ((dictionary.config & Config.SCALAR) === Config.SCALAR) {
    return (dictionary as DictionaryScalar<any>).handler.decode(data)
  }
}

function decodeVector<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryVector,
  data: ByteIterator
) {
  const vector = decoder.vector()

  while (!data.atEnd()) {
    const field: DictionaryEntry = dictionary.fields[data.take()]
    const { addValue } = vector.accumulate(field.name)
    addValue(decodeValue(decoder, field, data))
  }

  return vector.commit()
}

function decodeQueryVector<Vector>(
  decoder: Decoder<Vector, any>,
  dictionary: DictionaryVector,
  data: ByteIterator
) {
  const { accumulate, commit } = decoder.vector()
  const fields = dictionary.fields

  while (!data.atEnd()) {
    const field: DictionaryEntry = fields[data.take()]
    const callbacks = accumulate(field.name)

    if (has(field.config, Config.HAS_ARGUMENTS))
      while (!data.atEnd()) {
        const arg = fields[data.current()]
        if (has(arg.config, Config.ARGUMENT))
          callbacks.addArg(fields[data.take()].name)
        else break
      }

    if (has(field.config, Config.VECTOR))
      callbacks.addValue(
        decodeQueryVector(decoder, field as DictionaryVector, data)
      )

    callbacks.commit()
  }

  return commit()
}

function decodeList<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryListEntry,
  data: ByteIterator
) {
  const list = decoder.list()

  while (!data.atEnd())
    if ((dictionary.config & Config.VECTOR) === Config.VECTOR)
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

const scalar: DictionaryScalar<string> = {
  name: 'scalarList',
  config: Config.LIST | Config.SCALAR,
  handler: {
    encode: (data: string) => new Uint8Array(new TextEncoder().encode(data)),
    decode: (data: ByteIterator) => String.fromCharCode(data.take())
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

const JSONDecoder: Decoder<Object, Array<any>> = {
  list: () => {
    const accumulator = []
    return {
      accumulate: (value) => accumulator.push(value),
      commit: () => accumulator
    }
  },
  vector: () => {
    const accumulator = {}
    return {
      accumulate: (key) => ({
        addValue: (value) => (accumulator[key] = value)
      }),
      commit: () => accumulator
    }
  }
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

const ASTQueryDecoder: Decoder<SelectionSetNode, FieldNode> = {
  vector: () => {
    const accumulator: Array<FieldNode> = []
    return {
      commit: () => ({
        kind: 'SelectionSet',
        selections: accumulator
      }),
      accumulate: (key) => {
        let args: Array<ArgumentNode>
        let selectionSet: SelectionSetNode
        return {
          commit: () =>
            accumulator.push({
              kind: 'Field',
              name: {
                kind: 'Name',
                value: key
              },
              ...(args && { arguments: args }),
              ...(selectionSet && { selectionSet })
            }),
          addValue: (value) => (selectionSet = value),
          addArg: (key) =>
            (args || (args = [])).push({
              kind: 'Argument',
              value: {
                kind: 'Variable',
                name: {
                  kind: 'Name',
                  value: 'test'
                }
              },
              name: {
                kind: 'Name',
                value: key
              }
            })
        }
      }
    }
  }
}
const query = new Uint8Array([0, 2, 3, 0, END])
const data = new Uint8Array([0, 1, 2, 3, 4, END, 1, 0, 1, END, 1, 0, 1, END])

const decodedData = decodeValue(
  JSONDecoder,
  dataDictionary,
  createIterator(data)
)
const decodedQuery = decodeQueryVector(
  ASTQueryDecoder,
  queryDictionary,
  createIterator(query)
)
console.log(util.inspect(decodedData, { showHidden: false, depth: null }))
console.log(util.inspect(decodedQuery, { showHidden: false, depth: null }))

function createIterator<T extends Iterable<any>>(array: T): ByteIterator {
  let index = 0
  return {
    take: () => {
      index += 1
      return array[index - 1]
    },
    current: () => array[index],
    atEnd: () => array[index] === END || array[index] === undefined
  }
}

function has(bitmask: number, flag: Config) {
  return (bitmask & flag) === flag
}
