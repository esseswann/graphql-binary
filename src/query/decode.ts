import { DocumentNode, FieldDefinitionNode, FieldNode, OperationDefinitionNode, OperationTypeNode } from 'graphql/language/ast'

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

type Dictionary = {
  name: string,
  fields: Dictionary[]
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
  dictionary: Dictionary,
  data: ByteIterator
): ReadonlyArray<FieldDefinitionNode> {

  const fields: FieldDefinitionNode[] = []

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
  dictionary: Dictionary,
  data: ByteIterator
): FieldDefinitionNode {
  const field: Dictionary = dictionary.fields[data.next()]
  return {
    kind: 'FieldDefinition',
    type: {
     kind: 'NamedType',
     name: {
       kind: 'Name',
       value: 'test'
     }
    },
    name: {
      kind: 'Name',
      value: 'test'
    },
  }
}

function decodeCurried(dictionary: Dictionary): (data: Uint8Array) => DocumentNode {
  return function(data: Uint8Array) {
    return decode(dictionary, data)
  }
}

// const decoder = decodeCurried({})

// decoder(new Uint8Array([1, 2, 3]))