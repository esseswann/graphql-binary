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
    ({ name }) => {
      const metadata = find({ name: name.value, isArg: false }, dictionary.Query.decode)
      if (metadata.kind !== 'Scalar')
        return // FIXME
      if (!metadata)
        throw new Error(`Field ${name.value} was not found in the dictionary`)
      if (!metadata.typeHandler)
        throw new Error(`No handler for ${name.value}: ${metadata.type}`)
      if (!metadata.typeHandler.decode)
        throw new Error(`No decoder for ${name.value}: ${metadata.type}`)

      const [value, nextOffset] = metadata.typeHandler.decode(offset, response)
      result[name.value] = value
      offset = nextOffset
    },
    query.definitions[0].selectionSet.selections)
  console.log(result)
  return decode(response)
}

const decodePrimitive = (type, offset, data) =>
  !types[type]
    ? new Error(`Unknown decode type: ${type}`)
    : types[type](offset, data)

export default decodeResponse