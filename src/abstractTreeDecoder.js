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
  }
})

const decodeInputObject = (
) => {
  const result = {}
  // console.log(objectHandler(result))
  sexyDecode(objectHandler(result), [0, 4, 1, 0, 3, 2, 3, 4, 5, 4, 1, 0, 7, 255, 3, 0, 8])
  console.log(result)
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
    sexyDecode(handler(name, VECTOR), data, index)
  } else if (kind === SCALAR_LIST) {
    let jindex = data[index]
    const nextHandler = handler(name, SCALAR_LIST)
    while (jindex > 0) {
      index +=1
      nextHandler(data[index])
      jindex -= 1
    }
    index +=1
  }

  return sexyDecode(handler, data, index)
}

const dict = [
  { kind: SCALAR, name: 'geh' },
  { kind: VECTOR, name: 'bleh' },
  { kind: SCALAR_LIST, name: 'gleh' },
  { kind: VECTOR, name: 'mleh' },
]

decodeInputObject()