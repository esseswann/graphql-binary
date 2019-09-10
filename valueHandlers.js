export const decodeValue = (bytes, index, type) =>
  types[type].decode(bytes, index)

export const encodeValue = (bytes, index, type) =>
  types[type].encode(bytes, index)

const types = {
  Int: {
    decode: (bytes, index) => {
      const value = bytes[index]
      const offset = index + 1
      return [value, offset]
    },
    encode: (value) => {
      return [encodedValue, offset]
    }
  }
}