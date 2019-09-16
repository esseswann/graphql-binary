import slice from 'lodash/slice'
import concat from 'lodash/concat'
import msgPack from '@msgpack/msgpack'

export const decodeValue = (bytes, index, type) =>{
  const length = bytes[index]
  index += 1
  const end = index + length
  const value = msgPack.decode(slice(bytes, index, end))
  return [value, end + 1, typeof value]
}

export const encodeValue = (type, value, result) => {
  if (type === 'Int')
    value = parseInt(value, 10)
  const encodedValue = msgPack.encode(value)
  result.push(encodedValue.length)
  encodedValue.forEach(value => result.push(value)) // FIXME find a way not to use extra byte
}

const types = {
  Int: {
    decode: (bytes, index) => {
      const value = bytes[index]
      const offset = index + 1
      return [value, offset]
    },
    encode: (value, result) => {
      const encodedValue = parseInt(value, 10)
      result.push(encodedValue)
    }
  }
}