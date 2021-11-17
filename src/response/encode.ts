import {
  DocumentNode,
  FieldNode,
  GraphQLObjectType,
  isObjectType,
  isScalarType,
  Kind,
  ListTypeNode,
  SelectionNode,
  TypeNode
} from 'graphql'
import mergeArrays from '../mergeArrays'
import Decoder from '../query/decode'
import { END } from '../query/types'

function encode<Response>(
  decoder: Decoder,
  document: DocumentNode,
  data: Response
): Uint8Array {
  const operation = document.definitions[0]

  if (
    document.definitions.length > 1 ||
    operation.kind !== Kind.OPERATION_DEFINITION
  )
    throw new Error('Only single fragmentless operation definition allowed')

  const result = encodeVector(
    decoder,
    decoder.schema.getQueryType(),
    operation.selectionSet.selections,
    data
  )
  return result
}

function encodeVector(
  decoder: Decoder,
  type: GraphQLObjectType,
  selections: Readonly<SelectionNode[]>,
  data: any
): Uint8Array {
  let result = new Uint8Array()
  for (let index = 0; index < selections.length; index++) {
    const element = selections[index] as FieldNode // FIXME support fragments and union spread
    const field = type.astNode.fields.find(
      (field) => element.name.value === field.name.value
    )
    result = mergeArrays(
      result,
      encodeValue(decoder, field.type, element, data[element.name.value])
    )
  }
  return result
}

function encodeValue(
  decoder: Decoder,
  type: TypeNode,
  field: FieldNode,
  data: any
): Uint8Array {
  if (type.kind === Kind.NON_NULL_TYPE) type = type.type
  if (type.kind === Kind.NAMED_TYPE) {
    const schemaType = decoder.schema.getType(type.name.value)
    if (isScalarType(schemaType))
      return decoder.scalarHandlers[schemaType.name].encode(data)
    if (isObjectType(schemaType))
      return encodeVector(
        decoder,
        schemaType,
        field.selectionSet.selections,
        data
      )
  } else return encodeList(decoder, type, field, data)
  return null
}

function encodeList(
  decoder: Decoder,
  type: ListTypeNode,
  field: FieldNode,
  data: any[]
): Uint8Array {
  let result = new Uint8Array()
  for (const iterator of data)
    result = mergeArrays(
      result,
      encodeValue(decoder, type.type, field, iterator)
    )
  return mergeArrays(result, new Uint8Array([END]))
}

export default encode
