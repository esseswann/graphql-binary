import { DocumentNode, FieldDefinitionNode, FieldNode, ArgumentNode, InputValueDefinitionNode, IntValueNode, ObjectFieldNode, OperationDefinitionNode, OperationTypeNode, ValueNode } from 'graphql/language/ast'

// import types from 'graphql'

const MIN_LENGTH = 3
const END = 255

enum Operation  {
  query        = 0 << 0,
  mutation     = 1 << 1,
  subscription = 1 << 2,
}

enum Flags {
  Name         = 1 << 3,
  Variables    = 1 << 4,
  Directives   = 1 << 5,
}

type Dictionary = DictionaryField | DictionaryValue

enum Config {
  VECTOR   = 0 << 0,
  SCALAR   = 0 << 1,
  ARGUMENT = 0 << 2,
}

interface DictionaryField {
  name: string,
  config: Config,
  fields: DictionaryField[]
}

interface DictionaryValue {
  name: string,
  type: DictionaryType,
  decode: (data: ByteIterator) => any // FIXME should be
}

type DictionaryType = {
  name: string
}

type Variables = Map<number, string>

type Context = {
  variables: Variables
}

function decode(
  dictionary: DictionaryField,
  data: Uint8Array
): DocumentNode {

  if (data.length < MIN_LENGTH)
    throw new Error(`Data packet is less than ${MIN_LENGTH} bytes`)


  const byteIterator: ByteIterator = {
    next: () => 1,
    peek: () => 2,
    index: 0
  }

  const operation = Operation[byteIterator.next()] as OperationTypeNode

  const context: Context = {
    variables: generateVariblesContext(byteIterator)
  }

  const document: DocumentNode = {
    kind: 'Document',
    definitions: [{
      kind: 'OperationDefinition',
      operation: operation,
      selectionSet: {
        kind: 'SelectionSet',
        selections: decodeObjectType(context, dictionary.fields[0], byteIterator)
      }
    }]
  }

  return document
}

function generateVariblesContext(data: ByteIterator): Variables {
  return new Map()
}

function decodeObjectType(
  context: Context,
  dictionary: DictionaryField,
  data: ByteIterator
): ReadonlyArray<FieldNode> {

  const fields: FieldNode[] = []

  while (data.peek() !== END && data.peek() !== undefined)
    fields.push(decodeField(context, dictionary, data))

  return fields
}

type ByteIterator = Iterator<number>

interface Iterator<T> {
  next: () => T
  peek: () => T,
  index: number
}

function decodeField(
  context: Context,
  dictionary: DictionaryField,
  data: ByteIterator
): FieldNode {

  const field: DictionaryField = dictionary.fields[data.next()]

  // Order is important because data is an iterator
  const args = (field.config & Config.ARGUMENT) &&
    decodeArguments(context, field, data)

  // Order is important because data is an iterator
  const selections = (field.config & Config.VECTOR) &&
    decodeObjectType(context, field, data)

  return {
    kind: 'Field',
    name: {
      kind: 'Name',
      value: field.name
    },
    ...args && { arguments: args },
    ...selections && {
      selectionSet: {
        kind: 'SelectionSet',
        selections
      }
    }
  }
}

function decodeArguments(
  context: Context,
  dictionary: DictionaryField,
  data: ByteIterator
): ReadonlyArray<ArgumentNode> {

  const args: ArgumentNode[] = []

  // FIXME first argument is not handeled
  while (dictionary.fields[data.peek()].config & Config.ARGUMENT)
    args.push(decodeArgument(context, dictionary, data))

  return args
}

function decodeArgument(
  context: Context,
  dictionary: DictionaryField,
  data: ByteIterator
): ArgumentNode {
  const variable = context.variables.get(data.index)
  const arg = dictionary.fields[data.next()]
  return {
    kind: 'Argument',
    name: {
      kind: 'Name',
      value: arg.name
    },
    value: {
      kind: 'IntValue',
      value: 'test'
    }
  }
}

// function decodeInputValue(
//   dictionary: Dictionary,
//   data: ByteIterator
// ): ValueNode {
//   const field: DictionaryValue = dictionary[0]
//   // const result: IntValueNode = {
//   //   kind: 'IntValue',
//   //   value: field.decode(data)
//   // }
//   return result
// }

// function decodeInputField(
//   dictionary: Dictionary,
//   data: ByteIterator
// ): InputValueDefinitionNode {
//   const field: Dictionary = dictionary.fields[data.next()]
//   return {
//     kind: 'InputValueDefinition',
//     type: {
//       kind: 'NamedType',
//       name: {
//         kind: 'Name',
//         value: field.type.name
//       }
//      },
//     name: {
//       kind: 'Name',
//       value: field.name
//     }
//   }
// }

function decodeCurried(dictionary: DictionaryField): (data: Uint8Array) => DocumentNode {
  return function(data: Uint8Array) {
    return decode(dictionary, data)
  }
}

// const decoder = decodeCurried({})

// decoder(new Uint8Array([1, 2, 3]))