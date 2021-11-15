import { DocumentNode, FieldNode, GraphQLObjectType, isObjectType, isScalarType, Kind, ListTypeNode, SelectionNode, TypeNode } from 'graphql'
import { ByteIterator, createIterator } from '../iterator'
import Encoder from '../query/encode'
import { END } from '../query/types'

function decode<Result> (
  encoder: Encoder,
  document: DocumentNode,
  data: Uint8Array
): Result {
  const operation = document.definitions[0]

  if (document.definitions.length > 1 || operation.kind !== Kind.OPERATION_DEFINITION)
    throw new Error('Only single fragmentless operation definition allowed')

  const byteIterator = createIterator(data, END)
  const result = decodeVector(
    encoder,
    encoder.schema.getQueryType(),
    operation.selectionSet.selections,
    byteIterator
  )
  return result as Result
}

function decodeVector(
  encoder: Encoder,
  type: GraphQLObjectType,
  selections: Readonly<SelectionNode[]>,
  data: ByteIterator,
) {
  const result = {}
  for (let index = 0; index < selections.length; index++) {
    const element = selections[index] as FieldNode // FIXME support fragments and union spread
    const field = type.astNode.fields.find((field) => element.name.value === field.name.value)
    result[element.name.value] = decodeValue(encoder, field.type, element, data)
  }
  return result
}

function decodeValue(
  encoder: Encoder,
  type: TypeNode,
  field: FieldNode,
  data: ByteIterator,
) {
  if (type.kind === Kind.NON_NULL_TYPE) type = type.type
  if (type.kind === Kind.NAMED_TYPE) {
    const schemaType = encoder.schema.getType(type.name.value)
    if (isScalarType(schemaType))
      return encoder.scalarHandlers[schemaType.name].decode(data)
    if (isObjectType(schemaType))
      return decodeVector(encoder, schemaType, field.selectionSet.selections, data)
  } else
      return decodeList(encoder, type, field, data)
  return null
}

function decodeList (
  encoder: Encoder,
  type: ListTypeNode,
  field: FieldNode,
  data: ByteIterator,
) {
  const result = []
  while (!data.atEnd())
    result.push(decodeValue(encoder, type.type, field, data))
  data.take() // FIXME probably wrong
  return result
}

export default decode