import {
  decodeSignedLeb128,
  decodeUnsignedLeb128,
  encodeSignedLeb128,
  encodeUnsignedLeb128
} from '.'
import { createIterator } from '../iterator'
import { END } from '../query/types'

const unsignedLengths = [
  2 ** 7 - 1,
  2 ** 14 - 1,
  2 ** 21 - 1,
  2 ** 28 - 1
  // 2 ** 35 - 1 FIXME does not work for this
]

const signedLengths = [
  2 ** 7 - 1,
  -(2 ** 14 - 1),
  2 ** 21 - 1,
  -(2 ** 28 - 1)
  // 2 ** 35 - 1 FIXME does not work for this
]

unsignedLengths.map((value, index) =>
  test(`correct unsigned ${index + 1} byte length`, () => {
    const encoded = encodeUnsignedLeb128(value)
    const iterator = createIterator(encoded, END)
    const decoded = decodeUnsignedLeb128(iterator)
    expect(decoded).toEqual(value)
  })
)

signedLengths.map((value, index) =>
  test(`correct signed ${index + 1} byte length`, () => {
    const encoded = encodeSignedLeb128(value)
    const iterator = createIterator(encoded, END)
    const decoded = decodeSignedLeb128(iterator)
    expect(decoded).toEqual(value)
  })
)
