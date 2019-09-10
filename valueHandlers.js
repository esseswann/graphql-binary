export const decodeValue = (bytes, index, type) =>
  types[type].decode(bytes, index)

export const encodeValue = (type, value, result) =>
  types[type].encode(value, result)

const types = {
  Int: {
    decode: (bytes, index) => {
      const value = bytes[index]
      const offset = index + 1
      return [value, offset]
    },
    encode: (value, result) => {
      const encodedValue = value
      result.push(encodedValue)
    }
  }
}