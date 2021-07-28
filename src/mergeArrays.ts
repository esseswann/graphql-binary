export function mergeArrays(...arrays: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(arrays.reduce<number>(lengthsReducer, 0))
  let currentIndex = 0
  for (let i = 0; i < arrays.length; i++) {
    result.set(arrays[i], currentIndex)
    currentIndex += arrays[i].length
  }
  return result
}

function lengthsReducer(result: number, data: ArrayLike<any>): number {
  return result + data.length
}

export default mergeArrays
