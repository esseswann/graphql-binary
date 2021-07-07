import {
  ArgumentNode,
  DocumentNode,
  FieldDefinitionNode,
  FieldNode,
  InputValueDefinitionNode,
  IntValueNode,
  ObjectFieldNode,
  OperationDefinitionNode,
  OperationTypeNode,
  ValueNode
} from 'graphql/language/ast'

import {
  ByteIterator,
  Config,
  Context,
  DictionaryField,
  DictionaryValue,
  END,
  MIN_LENGTH,
  Operation,
  Variables
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

interface Decoder<Vector, List> {
  vector: VectorHandler<Vector>
  list: ListHandler<List>
}

interface VectorHandler<T> {
  create: () => T
  set: (vector: T, key: string, value: T) => T
}

interface ListHandler<T> {
  create: () => T[]
  set: (list: T[], value: T) => T
}

function decodeValue<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryValue,
  data: ByteIterator
): any {
  // Important to check if LIST first
  if ((dictionary.config & Config.LIST) === Config.LIST) {
    return decodeList(decoder, dictionary, data)
  }

  if ((dictionary.config & Config.VECTOR) === Config.VECTOR) {
    return decodeVector(decoder, dictionary, data)
  }

  if ((dictionary.config & Config.SCALAR) === Config.SCALAR) {
    return dictionary.decode(data)
  }
}

function decodeVector<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryValue,
  data: ByteIterator
) {
  const vector = decoder.vector.create()
  data.iterateWhileNotEnd(() => {
    let field: DictionaryValue = dictionary.fields[data.take()]
    decoder.vector.set(vector, field.name, decodeValue(decoder, field, data))
  })

  return vector
}

function decodeList<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryValue,
  data: ByteIterator
) {
  const list = decoder.list.create()
  data.iterateWhileNotEnd(() => {
    if ((dictionary.config & Config.VECTOR) === Config.VECTOR)
      decoder.list.set(list, decodeValue(decoder, dictionary.ofType, data))
    else decoder.list.set(list, dictionary.decode(data))
  })

  return list
}

// function decodeCurried(
//   dictionary: DictionaryField
// ): (data: Uint8Array) => DocumentNode {
//   return function (data: Uint8Array) {
//     return decode(dictionary, data)
//   }
// }

function createIterator<T extends Iterable<any>>(array: T): ByteIterator {
  let index = 0

  function take() {
    if (array[index] !== undefined) {
      index += 1
      return array[index - 1]
    }
  }

  function iterateWhileNotEnd(callback: () => void) {
    while (array[index] !== END && array[index] !== undefined) callback()
    take()
  }

  return {
    take,
    iterateWhileNotEnd
  }
}

console.log(Config)

const data = new Uint8Array([0, 1, 2, 3, 4, END, 1, 0, 1, END, END])

const scalar = {
  name: 'scalarList',
  config: Config.LIST | Config.SCALAR,
  fields: [],
  decode: (data) => data.take()
}

const vector = {
  name: 'vector',
  config: Config.VECTOR,
  fields: [scalar]
}

const dictionary: DictionaryValue = {
  name: 'Arg',
  config: Config.VECTOR,
  fields: [
    scalar,
    {
      name: 'vectorList',
      config: Config.LIST | Config.VECTOR,
      decode: (data) => data.take(),
      ofType: vector,
      fields: []
    }
  ]
}

const decoder: Decoder<Object, Array<any>> = {
  list: {
    create: () => [],
    set: (list, value) => {
      list.push(value)
      return list
    }
  },
  vector: {
    create: () => ({}),
    set: (vector, key, value) => {
      vector[key] = value
      return vector
    }
  }
}

const plest = decodeValue(decoder, dictionary, createIterator(data))
console.log(plest)
