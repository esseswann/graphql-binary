export interface ByteIterator<T> {
  take: () => T
  atEnd: () => boolean
  current: () => T
}

export function createIterator<T>(
  array: ArrayLike<T>,
  end: T
): ByteIterator<T> {
  let index = 0
  return {
    take: () => {
      index += 1
      return array[index - 1]
    },
    current: () => array[index],
    atEnd: () => array[index] === end || array[index] === undefined
  }
}
