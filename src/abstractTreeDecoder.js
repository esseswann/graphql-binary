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
  decode(objectHandler(result), [0, 10, 1, 0, 11, END, END]) //2, 3, 4, 5, 4, 1, 0, 7, END, 3, 3, 0, 8, END, 0, 9, 1, 0, 10, END, END, 0, 11, END, END, END])
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
      kind === SCALAR
        ? prepareScalar(nextHandler, data, nextIndex)
        : decode(nextHandler, data, nextIndex)
    )
  }
}

const prepareScalar = (handler, data, index) => {
  // Read header
  handler(data[index])
  return index + 1
}

const handleList = (handler, data, index) => {
  const jindex = data[index]
  while (jindex > 0)
    index = SCALAR & kind
      ? prepareScalar(handler, data, index)
      : decode(handler(), data, index)
  return index
}

const sexyDecode = (handler, data, index = 0) => {
  if (data[index] === END) {
    index += 1
    return index
  }

  const { kind, name } = dict[data[index]]
  index += 1

  if (kind === SCALAR) {
    handler(name, SCALAR)(data[index])
    index += 1
  } else if (kind === VECTOR) {
    index = sexyDecode(handler(name, VECTOR), data, index)
  } else if (kind === SCALAR_LIST) {
    let jindex = data[index]
    const nextHandler = handler(name, SCALAR_LIST)
    while (jindex > 0) {
      index +=1
      nextHandler(data[index])
      jindex -= 1
    }
    index +=1
  } else if (kind === VECTOR_LIST) {
    let jindex = data[index]
    const nextHandler = handler(name, VECTOR_LIST)
    index += 1
    while (jindex > 0) {
      index = sexyDecode(nextHandler(), data, index)
      jindex -= 1
    }
  }

  return sexyDecode(handler, data, index)
}

const dict = [
  { kind: SCALAR, name: 'scalar' },
  { kind: VECTOR, name: 'vector' },
  { kind: SCALAR_LIST, name: 'scalarList' },
  { kind: VECTOR_LIST, name: 'vectorList' },
]

decodeInputObject()