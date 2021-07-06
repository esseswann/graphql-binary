import { ByteIterator, Config, Context, DictionaryField, DictionaryValue, END, MIN_LENGTH, Operation, Variables } from './index'
import { ArgumentNode, DocumentNode, FieldDefinitionNode, FieldNode, InputValueDefinitionNode, IntValueNode, ObjectFieldNode, OperationDefinitionNode, OperationTypeNode, ValueNode } from 'graphql/language/ast'

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

interface Decoder<T> {
  vector: VectorHandler<T>,
  list: ListHandler<T>,
}

interface VectorHandler<T> {
  create: () => T,
  set: (vector: T, key: string, value: T) => T
}

interface ListHandler<T> {
  create: () => T,
  set: (list: T, value: T) => T
}

function decodeValue<T>(
  decoder: Decoder<T>,
  dictionary: DictionaryValue,
  data: ByteIterator,
): any {
  // Important to check if LIST first
  if (dictionary.config & Config.LIST)
    return decodeList(decoder, dictionary, data)
  if (dictionary.config & Config.VECTOR)
    return decodeVector(decoder, dictionary, data)
  if (dictionary.config & Config.SCALAR)
    return dictionary.decode(data)
}

function decodeVector<T>(
  decoder: Decoder<T>,
  dictionary: DictionaryValue,
  data: ByteIterator,
) {
  const vector = decoder.vector.create()
  while (true) {
    let field: DictionaryValue
    decoder.vector.set(vector, field.name, decodeValue(decoder, field, data))
  }
  return vector
}

function decodeList<T>(
  decoder: Decoder<T>,
  dictionary: DictionaryValue,
  data: ByteIterator,
) {
  const list = decoder.list.create()
  while (true) {
    let field: DictionaryValue
    decoder.list.set(list, decodeValue(decoder, field, data))
  }
}

const byteIterator: ByteIterator = {
  next: () => 1,
  peek: () => 2,
  index: 0
}

function decodeCurried(dictionary: DictionaryField): (data: Uint8Array) => DocumentNode {
  return function(data: Uint8Array) {
    return decode(dictionary, data)
  }
}