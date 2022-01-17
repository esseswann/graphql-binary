import calculateBitmaskCount from './calculateBitmaskCount'

export const MAX_FIELDS = 8 ** 2

export const decodePositionsFromBitmask = (
  fieldsCount: number,
  bytes: Uint8Array
): Array<number> => {

  // FIXME add checks
  if (bytes.length < 1)
    throw new Error('Field Bitmask cannot be empty')

  if (fieldsCount > MAX_FIELDS)
    throw new Error(`Fields count cannot be more than ${MAX_FIELDS}`)

  const bitmaskCount = calculateBitmaskCount(fieldsCount)

  const result = new Array()
  const controlByte = bytes[0]

  for (let i = bitmaskCount; i < 8; i++)
    if (controlByte & (1 << i))
      result.push(i - bitmaskCount)

  // FIXME SIMD can be used here
  let shift = 0
  for (let i = 0; i < bitmaskCount; i++)
    if (controlByte & (1 << i)) {
      shift += 1
      for (let j = 0; j < 8; j++)
        if (bytes[shift] & (1 << j))
          result.push((8 - bitmaskCount) + (8 * i) + j)
      }

  return result
}

export default decodePositionsFromBitmask