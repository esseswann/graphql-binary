// This is an R&D code don't use anything directly
import curry from 'lodash/fp/curry'

const END = 255
const SCALAR = 0b00
const VECTOR = 0b01
const SCALAR_LIST = 0b10
const VECTOR_LIST = 0b11
const LIST = 0b10

const objectHandler = (target) => keyHandler(target)

const scalarHandler = curry((target, key, value) => target[key] = value)

const scalarListHandler = curry((target, value) => target.push(value))

const keyHandler = curry((target, key, kind) => {
  if (kind === SCALAR) {
    return scalarHandler(target, key)
  } else if (kind === VECTOR) {
    const object = {}
    target[key] = object
    return objectHandler(object)
  } else if (kind === SCALAR_LIST) {
    const list = []
    target[key] = list
    return scalarListHandler(list)
  } else if (kind === VECTOR_LIST) {
    const list = []
    target[key] = list
    return () => {
      const object = {}
      list.push(object)
      return objectHandler(object)
    }
  }
})

const decodeInputObject = (
) => {
  const result = {}
  decode(objectHandler(result), [0, 10, 1, 0, 11, 2, 3, 4, 5, 4, 1, 0, 7, END, 3, 3, 0, 8, END, 0, 9, 1, 0, 10, END, END, 0, 11, END, END, END])
  console.log(result)
}

const decode = (
  handler,
  data,
  index = 0
) => {
  const current = data[index]
  const nextIndex = index + 1

  if (current === END)
    return nextIndex
  else {
    const { kind, name } = dict[current]
    const nextHandler = handler(name, kind)

    return decode(
      handler,
      data,
      LIST & kind
        ? handleList(nextHandler, data, nextIndex, kind)
        : kind === SCALAR
          ? prepareScalar(nextHandler, data, nextIndex)
          : decode(nextHandler, data, nextIndex)
    )
  }
}

const prepareScalar = (handler, data, index) => {
  const length = 1 // Read header
  handler(data[index])
  return index + length
}

const handleList = (handler, data, index, kind) => {
  let jindex = data[index]
  index += 1
  while (jindex > 0) {
    index = VECTOR & kind
      ? decode(handler(), data, index)
      : prepareScalar(handler, data, index)
    jindex--
  }
  return index
}

const dict = [
  { kind: SCALAR, name: 'scalar' },
  { kind: VECTOR, name: 'vector' },
  { kind: SCALAR_LIST, name: 'scalarList' },
  { kind: VECTOR_LIST, name: 'vectorList' },
]

decodeInputObject()