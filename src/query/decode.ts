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

function decode(
  dictionary: Dictionary,
  data: Uint8Array
): DocumentNode {

  if (data.length < MIN_LENGTH)
    throw new Error(`Data packet is less than ${MIN_LENGTH} bytes`)

  const document: DocumentNode = {
    kind: 'Document',
    definitions: [{
      kind: 'OperationDefinition',
      operation: Operation[data[0]] as OperationTypeNode,
      selectionSet: {
        kind: 'SelectionSet',
        selections: []
      }
    }]
  }

  return document
}

function decodeObjectType(
  dictionary: DictionaryField,
  data: ByteIterator
): ReadonlyArray<FieldNode> {

  const fields: FieldNode[] = []

  while (data.peek() !== END && data.peek() !== undefined)
    fields.push(decodeField(dictionary, data))

  return fields
}

type ByteIterator = Iterator<number>

interface Iterator<T> {
  next: () => T
  peek: () => T
}

function decodeField(
  dictionary: DictionaryField,
  data: ByteIterator
): FieldNode {

  const field: DictionaryField = dictionary.fields[data.next()]

  // Order is important because data is an iterator
  const args = (field.config & Config.ARGUMENT) &&
    decodeArguments(field, data)

  // Order is important because data is an iterator
  const selections = (field.config & Config.VECTOR) &&
    decodeObjectType(field, data)

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
  dictionary: DictionaryField,
  data: ByteIterator
): ReadonlyArray<ArgumentNode> {
  return []
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

function decodeCurried(dictionary: Dictionary): (data: Uint8Array) => DocumentNode {
  return function(data: Uint8Array) {
    return decode(dictionary, data)
  }
}

// const decoder = decodeCurried({})

// decoder(new Uint8Array([1, 2, 3]))