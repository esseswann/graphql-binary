import find from 'lodash/fp/find'
import forEach from 'lodash/fp/forEach'
import map from 'lodash/fp/map'

import { encodeLength } from 'length'

const encodeResponse = (query, dictionary, response) => {
  let result = new Uint8Array()
  query.definitions[0].name.value = 'Query' // FIXME
  const callback = (nextData) => (result = concatTypedArrays(result, nextData))
  encodeMap(query.definitions[0], dictionary, response, callback)
  return result
}

// FIXME this whole block is a bad way, we need to put handlers into query definitons
const encodeMap = (definition, dictionary, data, callback) => {
  const metadata = dictionary[definition.name.value].decode
  forEach((field) => {
    const name = field.name.value
    const { typeHandler, kind, type, isList } = find({ name, isArg: false }, metadata)
    if (isList) {
      let result = new Uint8Array(encodeLength(data[name].length))
      forEach(value => {
        if (kind === 'SCALAR')
          result = concatTypedArrays(result, typeHandler.encode(value))
        else
          encodeMap({ ...field, name: { ...field.name, value: type } }, dictionary, value,
            localValue => result = concatTypedArrays(result, localValue))
        },
        data[name])
      callback(result)
    } else if (kind === 'SCALAR')
      callback(typeHandler.encode(data[name]))
    else {
      // FIXME fix this utter bullshit
      const subfield = { ...field, name: { ...field.name, value: type } }
      encodeMap(subfield, dictionary, data[name], callback)
    }
  }, definition.selectionSet.selections)
}

const concatTypedArrays = (left, right) => {
  const result = new Uint8Array(left.byteLength + right.byteLength)
  result.set(left, 0), result.set(right, left.byteLength)
  return result
}

export default encodeResponse
