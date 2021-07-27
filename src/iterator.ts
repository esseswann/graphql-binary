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
      if (length !== undefined) {
        // FIXME this is probably incorrect
        return array.slice((index += 1), (index += length))
      } else {
        index += 1
        return array[index - 1]
      }
    },
    current: () => array[index],
    atEnd: () => array[index] === end || array[index] === undefined
  }
}
