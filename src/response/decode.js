import { decode } from '@msgpack/msgpack'
import types from 'types'
import forEach from 'lodash/fp/forEach'
import find from 'lodash/fp/find'

const decodeResponse = (
  query,
  dictionary,
  response
) => {
  const result = {}
  let offset = 0
  forEach(
    ({ name }) => decodeResponseField(name.value, dictionary.Query.decode, offset, response, result),
    query.definitions[0].selectionSet.selections)
  console.log(result)
  return decode(response)
}

const decodeResponseField = (name, dictionary, offset, data, result) => {
  const metadata = find({ name, isArg: false }, dictionary)
  if (!metadata)
    throw new Error(`Field ${name.value} was not found in the dictionary`)
  if (metadata.kind !== 'SCALAR')
    return // FIXME
  if (!metadata.typeHandler)
    throw new Error(`No handler for ${name.value}: ${metadata.type}`)
  if (!metadata.typeHandler.decode)
    throw new Error(`No decoder for ${name.value}: ${metadata.type}`)

  const [value, nextOffset] = metadata.typeHandler.decode(offset, data)
  result[name] = value
  offset = nextOffset
}

export default decodeResponse