import { decodeLength } from 'length'

import forEach from 'lodash/fp/forEach'
import find from 'lodash/fp/find'
import map from 'lodash/fp/map'

const decodeResponse = (query, dictionary, response) => {
  const result = {}
  offset = 0
  const callback = (key, value) => (result[key] = value)

  decodeMap(query.definitions[0], 'Query', dictionary, response, callback)
  return result
}

let offset = 0 // FIXME this is super temporary

const decodeMap = (definition, type, dictionary, data, callback) => {
  const metadata = dictionary[type].decode
  forEach((field) => {
    const name = field.name.value
    const fieldMetadata = find({ name, isArg: false }, metadata)
    if (fieldMetadata.isList) {
      const [length, nextOffset] = decodeLength(data, offset)
      offset = nextOffset
      let index = 0
      const localResult = []
      while (index < length) {
        if (fieldMetadata.kind === 'SCALAR') {
          const [value, nextOffset] = fieldMetadata.typeHandler.decode(offset, data)
          offset = nextOffset
          localResult.push(value)
        } else {
          let localMapResult = {}
          decodeMap(
            field,
            fieldMetadata.type,
            dictionary,
            data,
            (key, value) => (localMapResult[key] = value)
          )
          localResult.push(localMapResult)
        }
        index += 1
      }
      callback(name, localResult)
    } else if (fieldMetadata.kind === 'SCALAR') {
      const [value, nextOffset] = fieldMetadata.typeHandler.decode(offset, data)
      offset = nextOffset
      callback(name, value)
    } else {
      let localResult = {}
      decodeMap(
        field,
        fieldMetadata.type,
        dictionary,
        data,
        (key, value) => (localResult[key] = value)
      )
      callback(name, localResult)
    }
  }, definition.selectionSet.selections)
}

export default decodeResponse
