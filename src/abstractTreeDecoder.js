// This is an R&D code don't use anything directly
import curry from 'lodash/fp/curry'

const END = 255
const SCALAR = 0b00
const VECTOR = 0b01
const SCALAR_LIST = 0b10
const VECTOR_LIST = 0b11

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
  // console.log(objectHandler(result))
  sexyDecode(objectHandler(result), [0, 4, 1, 0, 3, 2, 3, 4, 5, 4, 1, 0, 7, END, 3, 3, 0, 8, END, 0, 9, END, 0, 10, END])
  console.log(result.vector)
}


let index = 0 // Important that this is a mutable reference

const sexyDecode = (handler, data) => {
  if (data[index] === END || index >= data.length) {
    index += 1
    return // Exit here
  }

  const { kind, name } = dict[data[index]]
  index += 1

  if (kind === SCALAR) {
    handler(name, SCALAR)(data[index])
    index += 1
  } else if (kind === VECTOR) {
    // Should return index here for purity
    sexyDecode(handler(name, VECTOR), data)
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
      console.log(index, jindex)
      // Should return index here for purity
      sexyDecode(nextHandler(), data)
      console.log(index, jindex)
      jindex -= 1
    }
  }

  return sexyDecode(handler, data)
}

const dict = [
  { kind: SCALAR, name: 'scalar' },
  { kind: VECTOR, name: 'vector' },
  { kind: SCALAR_LIST, name: 'scalarList' },
  { kind: VECTOR_LIST, name: 'vectorList' },
]

decodeInputObject()