import {
  ArgumentNode,
  DocumentNode,
  FieldDefinitionNode,
  FieldNode,
  InputValueDefinitionNode,
  IntValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  ListValueNode,
  OperationDefinitionNode,
  OperationTypeNode,
  ValueNode
} from 'graphql/language/ast'
import util from 'util'
import {
  ByteIterator,
  Config,
  Context,
  DictionaryField,
  Decoder,
  DictionaryValue,
  END,
  MIN_LENGTH,
  Operation,
  Variables,
  Dictionary
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
  data.iterateWhileNotEnd(() => {
    let field: DictionaryEntry = dictionary.fields[data.take()]
    vector.accumulate(field.name, decodeValue(decoder, field, data))
  })

  return vector.commit()
}

function decodeList<Vector, List>(
  decoder: Decoder<Vector, List>,
  dictionary: DictionaryListEntry,
  data: ByteIterator
) {
  const list = decoder.list()

  data.iterateWhileNotEnd(() =>
    list.accumulate(
      (dictionary.config & Config.VECTOR) === Config.VECTOR
        ? decodeValue(
            decoder,
            (dictionary as DictionaryListVector).ofType,
            data
          )
        : (dictionary as DictionaryListScalar<any>).handler.decode(data)
    )
  )

  return list.commit()
}

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

const data = new Uint8Array([0, 1, 2, 3, 4, END, 1, 0, 1, END, 1, 0, 1, END])

interface DictionaryInterface {
  name: string
  config: Config
}

interface DictionaryScalar<T extends any> extends DictionaryInterface {
  handler: TypeHandler<T>
}

interface DictionaryVector extends DictionaryInterface {
  fields: DictionaryEntry[]
}

interface DictionaryList extends DictionaryInterface {
  nesting: number
}

type DictionaryUnaryEntry = DictionaryScalar<any> | DictionaryVector
type DictionaryListEntry = DictionaryListScalar<any> | DictionaryListVector

type DictionaryEntry = DictionaryUnaryEntry | DictionaryListEntry

interface DictionaryListVector extends DictionaryList {
  ofType: DictionaryScalar<any> | DictionaryVector
}

interface DictionaryListScalar<T extends any>
  extends DictionaryList,
    DictionaryScalar<T> {}

interface TypeHandler<T extends any> {
  encode: (data: T) => Uint8Array
  decode: (data: ByteIterator) => T
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

const dictionary: DictionaryVector = {
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

const create = () => {
  const accumulator = {}
  return {
    aggregate: (key, value) => (accumulator[key] = value),
    commit: () => accumulator
  }
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
      accumulate: (key, value) => (accumulator[key] = value),
      commit: () => accumulator
    }
  }
}

const ASTDecoder: Decoder<ObjectValueNode, ListValueNode> = {
  list: () => {
    const accumulator = []
    return {
      accumulate: (value) => accumulator.push(value),
      commit: () => ({
        kind: 'ListValue',
        values: accumulator
      })
    }
  },
  vector: () => {
    const accumulator: Array<{ key: string; value: any }> = []
    return {
      accumulate: (key, value) => accumulator.push({ key, value }),
      commit: () => ({
        kind: 'ObjectValue',
        fields: accumulator.map(generateObjectFieldNode)
      })
    }
  }
}

const generateObjectFieldNode = ({ key, value }): ObjectFieldNode => ({
  kind: 'ObjectField',
  name: key,
  value: {
    kind: 'IntValue',
    value
  }
})

const plest = decodeValue(JSONDecoder, dictionary, createIterator(data))
console.log(util.inspect(plest, { showHidden: false, depth: null }))
