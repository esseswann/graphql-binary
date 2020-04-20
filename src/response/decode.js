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
  offset = 0
  const callback = (key, value) =>
    result[key] = value

  decodeMap(query.definitions[0], 'Query', dictionary, response, callback)
  return result
}

let offset = 0 // FIXME this is super temporary

const decodeMap = (definition, type, dictionary, data, callback) => {
  const metadata = dictionary[type].decode
  forEach(
    field => {
      const name = field.name.value
      const fieldMetadata = find({ name, isArg: false }, metadata)
      if (fieldMetadata.kind === 'SCALAR') {
        const [value, nextOffset] = fieldMetadata.typeHandler.decode(offset, data)
        offset = nextOffset
        callback(name, value)
      }
      else {
        let localResult = {}
        decodeMap(field, fieldMetadata.type, dictionary, data, (key, value) => localResult[key] = value)
        callback(name, localResult)
      }
    },
    definition.selectionSet.selections)
}

export default decodeResponse