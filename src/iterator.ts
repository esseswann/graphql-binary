export interface ByteIterator {
  take(): number
  take(length: number): Uint8Array
  atEnd(): boolean
  current(): number
}

export function createIterator(array: Uint8Array, end: number): ByteIterator {
  let index = 0
  return {
    take(length?: number): any {
      if (length !== undefined) return array.slice(index, (index += length))
      else {
        index += 1
        return array[index - 1]
      }
    },
    current: () => array[index],
    atEnd: () => array[index] === end || array[index] === undefined
  }
}
