import { decodeLength, encodeLength } from '.'

const lengths = [2 ** 7 - 1, 2 ** 14 - 1, 2 ** 21 - 1, 2 ** 28 - 1]

lengths.map((value, index) =>
  test(`correct ${index + 1} byte length`, () =>
    expect(decodeLength(encodeLength(value))).toEqual([value, index + 1]))
)
