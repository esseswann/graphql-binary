import calculateBitmaskCount from './calculateBitmaskCount'

const encodePositionsAsBitmask = (
  fieldsCount: number,
  positions: Array<number>
): Uint8Array => {
  // FIXME add checks
  positions.sort((a, b) => a < b ? -1 : 1)
  
  const bitmaskCount = calculateBitmaskCount(fieldsCount)

  let result: Array<number> = [0]
  
  for (const position of positions) {
    const shiftedPosition = bitmaskCount + position
    if (shiftedPosition < 8)
      result[0] |= (1 << shiftedPosition)
    else {
      const bitmaskIndex = Math.floor(shiftedPosition / 8)
      result[0] |= (1 << bitmaskIndex - 1)
      result[bitmaskIndex] |= (1 << shiftedPosition % 8)
    }
  }
  // FIXME this might be avoided
  result = result.filter(item => item != null)
  return new Uint8Array(result)
}

export default encodePositionsAsBitmask