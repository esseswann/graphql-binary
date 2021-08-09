// https://github.com/stoklund/varint#prefixvarint
// WebAssembly/design#601
import { ByteIterator } from '../iterator'

// This is LEB128 implementation
// FIXME infinite shifting attack is possible
export function decodeVarInt(data: ByteIterator): number {
  let length: number = 0
  let index: number = 0
  let byte: number

  while (!data.atEnd()) {
    byte = data.take()
    length += (byte & 0x7f) << (index * 7)
    if (byte >> 7 === 0) break
    else index++
  }

  return length
}

export const encodeVarInt = (length: number): Uint8Array => {
  const array: Array<number> = []
  let lowerBits: number
  let highBit: number
  while (length > 0) {
    lowerBits = length & 0x7f
    length = length >> 7
    highBit = length ? 1 : 0
    array.push((highBit << 7) + lowerBits)
  }

  return new Uint8Array(array)
}
