import { DocumentNode, FieldNode, GraphQLObjectType, isObjectType, isScalarType, Kind, ListTypeNode, SelectionNode, TypeNode } from 'graphql'
import { ByteIterator, createIterator } from '../iterator'
import Decoder from '../query/decode'
import { END } from '../query/types'

function decode<Result> (
  decoder: Decoder,
  document: DocumentNode,
  data: Uint8Array
): Result {
  const operation = document.definitions[0]

  if (document.definitions.length > 1 || operation.kind !== Kind.OPERATION_DEFINITION)
    throw new Error('Only single fragmentless operation definition allowed')

  console.log(data)
  const byteIterator = createIterator(data, END)
  const result = decodeVector(
    decoder,
    decoder.schema.getQueryType(),
    operation.selectionSet.selections,
    byteIterator
  )
  return result as Result
}

function decodeVector(
  decoder: Decoder,
  type: GraphQLObjectType,
  selections: Readonly<SelectionNode[]>,
  data: ByteIterator,
) {
  const result = {}
  for (let index = 0; index < selections.length; index++) {
    const element = selections[index] as FieldNode // FIXME support fragments and union spread
    const field = type.astNode.fields.find((field) => element.name.value === field.name.value)
    result[element.name.value] = decodeValue(decoder, field.type, element, data)
  }
  return result
}

function decodeValue(
  decoder: Decoder,
  type: TypeNode,
  field: FieldNode,
  data: ByteIterator,
) {
  if (type.kind === Kind.NON_NULL_TYPE) type = type.type
  if (type.kind === Kind.NAMED_TYPE) {
    const schemaType = decoder.schema.getType(type.name.value)
    if (isScalarType(schemaType))
      return decoder.scalarHandlers[schemaType.name].decode(data)
    if (isObjectType(schemaType))
      return decodeVector(decoder, schemaType, field.selectionSet.selections, data)
  } else
      return decodeList(decoder, type, field, data)
  return null
}

function decodeList (
  decoder: Decoder,
  type: ListTypeNode,
  field: FieldNode,
  data: ByteIterator,
) {
  const result = []
  while (!data.atEnd())
    result.push(decodeValue(decoder, type.type, field, data))
  return result
}

export default decode