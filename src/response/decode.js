import { decode } from '@msgpack/msgpack'
import types from 'types'
import forEach from 'lodash/fp/forEach'

const decodeResponse = (
  query,
  dictionary,
  response
) => {
  return decode(response)
}

const decodePrimitive = (type, offset, data) =>
  !types[type]
    ? new Error(`Unknown decode type: ${type}`)
    : types[type](offset, data)

export default decodeResponse