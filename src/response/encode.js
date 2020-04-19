import { encode } from '@msgpack/msgpack'
import forEach from 'lodash/fp/forEach'
import find from 'lodash/fp/find'

const encodeResponse = (
  query,
  dictionary,
  response
) => {
  let result = new Uint8Array()
  const callback = nextData =>
    result = concatTypedArrays(result, nextData)
  forEach(
    ({ name }) => encodeResponseField(name.value, dictionary.Query.decode, response, callback),
    query.definitions[0].selectionSet.selections)
  return result
}

// const encodeFields = (fields, dictionary, data, callback) =>
//   forEach(
//     ({ name }) => encodeResponseField(name.value, dictionary.decode, data, callback),
//     fields)

const encodeResponseField = (name, dictionary, data, callback) => {
  if (data[name] === undefined)
    throw new Error(`Field ${name} was not found in response`)
  const metadata = find({ name, isArg: false }, dictionary)
  if (!metadata)
    throw new Error(`Field ${name} was not found in the dictionary`)
  if (metadata.kind !== 'SCALAR')
    return // FIXME
  if (!metadata.typeHandler)
    throw new Error(`No handler for ${name}: ${metadata.type}`)
  if (!metadata.typeHandler.encode)
    throw new Error(`No encoder for ${name}: ${metadata.type}`)
  callback(metadata.typeHandler.encode(data[name]))
}

const concatTypedArrays = (left, right) => {
  const result = new Uint8Array(left.byteLength + right.byteLength)
  result.set(left, 0),
  result.set(right, left.byteLength)
  return result
}

export default encodeResponse