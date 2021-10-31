import { decodeVarInt, encodeVarInt } from '.'
import { createIterator } from '../iterator'
import { END } from '../query/types'

const lengths = [
  2 ** 7 - 1,
  2 ** 14 - 1,
  2 ** 21 - 1,
  2 ** 28 - 1,
  // 2 ** 35 - 1 FIXME does not work for this
]

lengths.map((value, index) =>
  test(`correct ${index + 1} byte length`, () => {
    const encoded = encodeVarInt(value)
    const iterator = createIterator(encoded, END)
    const decoded = decodeVarInt(iterator)
    expect(decoded).toEqual(value)
  }))
