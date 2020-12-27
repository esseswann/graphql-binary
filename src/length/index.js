// FIXME should use something standard
// https://github.com/stoklund/varint#prefixvarint
// WebAssembly/design#601

// This is LEB128 implementation
// FIXME infinite shifting attack is possible
export const decodeLength = (data, offset = 0) => {
  let length = 0
  let index = 0
  let byte

  for (index; index <= data.length; index++){
    byte = data[offset + index]

    length += (byte & 0x7f) << (index * 7)

    if (byte >> 7 === 0) {
      break;
    }
  }

  return [length, offset + index + 1]
}

export const encodeLength = length => {
  const array = []
  let lowerBits
  let highBit
  while (length > 0) {
    lowerBits = length & 0x7f
    length = length >> 7
    highBit = length ? 1 : 0
    array.push((highBit << 7) + lowerBits)
  }

  return array
}