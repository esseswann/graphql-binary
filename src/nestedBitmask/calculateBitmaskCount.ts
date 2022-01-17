const calculateBitmaskCount = (fieldsCount: number): number => {
  if (fieldsCount < 9) return 1
  const minBits = Math.floor(fieldsCount / 8)
  const remainderBits = fieldsCount % 8
  return (8 - minBits) < remainderBits
    ? minBits + 1
    : minBits
}

export default calculateBitmaskCount