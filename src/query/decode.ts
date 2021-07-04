import { DocumentNode, OperationTypeNode, OperationDefinitionNode, FieldNode } from 'graphql/language/ast'
// import types from 'graphql'

const MIN_LENGTH = 3

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
}

function decode(dictionary: Dictionary, data: Uint8Array): DocumentNode {

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

function decodeCurried(dictionary: Dictionary): (data: Uint8Array) => DocumentNode {
  return function(data: Uint8Array) {
    return decode(dictionary, data)
  }
}

const decoder = decodeCurried({})

decoder(new Uint8Array([1, 2, 3]))