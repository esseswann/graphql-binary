export function mergeArrays(...arrays: Uint8Array[]): Uint8Array {
  const myArray = new Uint8Array(arrays.reduce<number>(lengthsReducer, 0))
  for (let i = 0; i < arrays.length; i++)
    myArray.set(arrays[i], arrays[i - 1]?.length || 0)
  return myArray
}

function lengthsReducer(result: number, data: ArrayLike<any>): number {
  return result + data.length
}

export default mergeArrays
