// This is an R&D code don't use anything directly
import util from 'util'

const END = 255
const SCALAR = 0b00
const VECTOR = 0b01
const SCALAR_LIST = 0b10
const VECTOR_LIST = 0b11
const LIST = 0b10

const generateHandlerDispatcher = (
  createObject,
  addToObject,
  createList,
  addToList,
  createScalar
) => {
  
  const handleScalar = (callback) => (kind, value) =>
    callback(createScalar(kind, value))

  const handleObject = (callback, key) => {
    const object = createObject(key)
    callback(object)
    return (name, kind) => {
      const handler = addToObject(object)(name)
      return kind === SCALAR
        ? handleScalar(handler)
        : kind === VECTOR
          ? handleObject(handler, name)
          : kind === SCALAR_LIST
            ? handleListScalar(handler, name)
            : handleListVector(handler, name)
    }
  }
  
  const handleListScalar = (callback, key) => {
    const list = createList(key)
    callback(list)
    return handleScalar(addToList(list))
  }

  const handleListVector = (callback, key) => {
    const list = createList(key)
    callback(list)
    const handler = addToList(list)
    return () => handleObject(handler)
  }

  return callback => handleObject(callback)
}

const argsHandler = generateHandlerDispatcher(
  // create object
  () => ({ kind: 'ObjectValue', fields: [] }),
  // add to object
  (target) => (key) => (value) => target.fields.push({
    kind: 'ObjectField',
    name: { kind: 'Name', value: key },
    value
  }),
  // create list
  () => ({ kind: 'ListValue', fields: [] }),
  // add to list
  (target) => (value) => target.fields.push(value),
  // scalar handler
  (kind, value) => ({
    kind,
    value
  })
)

const jsonHandler = generateHandlerDispatcher(
  () => ({}),
  (target) => (key) => (value) => target[key] = value,
  () => [],
  (target) => (value) => target.push(value),
  (kind, value) => value
)

const decodeInputObject = (
) => {
  let result
  decode(argsHandler(value => result = value), [0, 10, 1, 0, 11, 2, 3, 4, 5, 4, 1, 0, 7, END, 3, 3, 0, 8, END, 0, 9, 1, 0, 10, END, END, 0, 11, END, END, END])
  console.log(util.inspect(result, false, null, true /* enable colors */))
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
  handler('bleh', data[index])
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