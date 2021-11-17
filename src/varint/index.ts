// https://github.com/stoklund/varint#prefixvarint
// WebAssembly/design#601
import { ByteIterator } from '../iterator'

const MAX_BITS = Number.MAX_SAFE_INTEGER.toString(2).length
const BYTE_SIZE = 8
const MAX_SHIFTS = Math.floor(MAX_BITS / BYTE_SIZE)

export function decodeUnsignedLeb128(data: ByteIterator): number {
  let number: number = 0
  let index: number = 0
  let byte: number

  while (index < MAX_SHIFTS) {
    // Prevents infinite shifting attack
    byte = data.take()
    number += (byte & 0x7f) << (index * 7)
    if (byte >> 7 === 0) break
    else index++
  }

  return number
}

export const encodeUnsignedLeb128 = (value: number): Uint8Array => {
  if (value < 0)
    throw new Error(`Only encodes positive numbers. ${value} is not allowed`)
  const array: Array<number> = []

  let lowerBits: number
  let highBit: number
  while (value > 0) {
    lowerBits = value & 0x7f
    value = value >> 7
    highBit = value ? 1 : 0
    array.push((highBit << 7) + lowerBits)
  }

  return new Uint8Array(array)
}

export const decodeSignedLeb128 = (input: ByteIterator): number => {
  let result = 0
  let shift = 0
  let index = 0

  while (index < MAX_SHIFTS) {
    // Prevents infinite shifting attack
    index += 1
    const byte = input.take()
    result |= (byte & 0x7f) << shift
    shift += 7
    if ((0x80 & byte) === 0) {
      if (shift < 32 && (byte & 0x40) !== 0) {
        return result | (~0 << shift)
      }
      return result
    }
  }
}

export const encodeSignedLeb128 = (value: number): Uint8Array => {
  value |= 0
  const result: Array<number> = []

  while (true) {
    // Prevents infinite shifting attack
    const byte = value & 0x7f
    value >>= 7
    if (
      (value === 0 && (byte & 0x40) === 0) ||
      (value === -1 && (byte & 0x40) !== 0)
    ) {
      result.push(byte)
      return new Uint8Array(result)
    }
    result.push(byte | 0x80)
  }
}
