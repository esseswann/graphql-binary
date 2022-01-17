import { decodeNestedBitmask, encodeNestedBitmask } from '.'
import { MAX_FIELDS } from './decode'

for (let index = 0; index < MAX_FIELDS; index++) {
  const fieldsCount = index
  const positions = Array.from(Array(index).keys())
  test('decoded nested bitmask matches encoded', async () => {
    const encoded = encodeNestedBitmask(fieldsCount, positions)
    const decoded = decodeNestedBitmask(fieldsCount, encoded)
    expect(positions).toEqual(decoded)
  })
}

for (let index = 0; index < MAX_FIELDS; index++) {
  const fieldsCount = index
  const positions = Array.from(Array(index).keys()).sort(() => 0.5 - Math.random())
  test('unsorted decoded nested bitmask matches encoded', async () => {
    const encoded = encodeNestedBitmask(fieldsCount, positions)
    const decoded = decodeNestedBitmask(fieldsCount, encoded)
    // FIXME positions are sorted in place anyway, use something immutable
    expect(positions.sort((a, b) => a < b ? -1 : 1)).toEqual(decoded)
  })
}

for (let index = 0; index < MAX_FIELDS; index++) {
  const fieldsCount = index
  const positions: Array<number> = []
  for (let jindex = 0; jindex < index; jindex++)
    if (0.5 > Math.random())
      positions.push(jindex)
  test('sparse nested bitmask matches encoded', async () => {
    const encoded = encodeNestedBitmask(fieldsCount, positions)
    const decoded = decodeNestedBitmask(fieldsCount, encoded)
    expect(positions).toEqual(decoded)
  })
}