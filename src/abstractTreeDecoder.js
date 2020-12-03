// This is an R&D code don't use anything directly
import util from 'util'

const END = 255
const SCALAR   = 0b0
const VECTOR   = 0b1
const ARGUMENT = 0b100
const LIST     = 0b10


// const query = {
//   object: {
//     create: () => ({
//       kind: 'Field',
//       name: { kind: 'Name', value: key },
//       arguments: [],
//       directives: []
//     }),
//     add: (target) => (kind) =>
//       ARGUMENT & kind 
//   }
// }

const argument = {
  object: {
    create: () => ({ kind: 'ObjectValue', fields: [] }),
    add: (target) => (key) => (value) => 
      target.fields.push({
        kind: 'ObjectField',
        name: { kind: 'Name', value: key },
        value
      })
  },
  list: {
    create: () => ({ kind: 'ObjectValue', fields: [] }),
    add: (target) => (value) => target.fields.push(value),
  },
  scalar: {
    create: (kind, value) => ({
      kind,
      value: typeof value === 'string'
        ? value
        : JSON.stringify(value)
      })
  }
}

const argumentHandler = (callback, kind) => {
  if (kind === 4) { // SCALAR
    return (kind, value) =>
      callback(argument.scalar.create(kind, value))
  } else if (kind === 5) { // VECTOR
    const object = argument.object.create()
    callback(object)
    return (key, kind) => argumentHandler(argument.object.add(object)(key), kind)
  }
}

const queryHandler = (target) => (key, kind) => {

  const object = { name: { kind: 'Name', value: key } }
  const hasChildren = !!target.selectionSet
  const localTarget = hasChildren
    ? target.selectionSet.selections[target.selectionSet.selections.length - 1]
    : target

  if (ARGUMENT & kind) {
    object.kind = 'Argument'
    localTarget.arguments.push(object)
    return argumentHandler((value) => object.value = value, kind)
  // } else if (DIRECTIVE & kind) {
  //   object.kind = 'Directive'
  //   localTarget.directives.push[object]
  //   return (value) => object.value = value
  } else {
    object.kind = 'Field'
    object.arguments = []
    object.directives = []
    if (!hasChildren) {
      target.selectionSet = {
        kind: 'SelectionSet',
        selections: []
      }
    }
    target.selectionSet.selections.push(object)
    if (VECTOR & kind)
      return queryHandler(object)
  }
}

const decodeInputObject = (
) => {
  const result = {
    arguments: [],
    directives: []
  }
  
  decode(
    dict,
    queryHandler(result),
    data),
    console.log(util.inspect(result, false, null, true))
}

const data = [0, 1, 5, 4, 1, 255, 0, 255, 255]
  // [0, 10, 1, 0, 11, 2, 3, 4, 5, 4, 1, 4, 50, END, 3, 3, 0, 8, END, 0, 9, 1, 0, 10, END, END, 0, 11, END, END, END])
const decode = (
  dictionary,
  handler,
  data,
  index = 0
) => {
  const current = data[index]
  const nextIndex = index + 1

  if (current === END)
    return nextIndex
  else {
    const { kind, name } = dictionary[current]
    const nextHandler = handler(name, kind)

    return decode(
      dictionary,
      handler,
      data,
      !(ARGUMENT & kind) && !(VECTOR & kind)
        ? nextIndex
        : LIST & kind
          ? handleList(dictionary, nextHandler, data, nextIndex, kind)
          : VECTOR & kind
            ? decode(dictionary, nextHandler, data, nextIndex)
            : prepareScalar(nextHandler, data, nextIndex)
    )
  }
}

const prepareScalar = (handler, data, index) => {
  const length = 1 // Read header
  handler('bleh', data[index])
  return index + length
}

const handleList = (
  dictionary,
  handler,
  data,
  index,
  kind
) => {
  let jindex = data[index]
  index += 1
  while (jindex > 0) {
    index = VECTOR & kind
      ? decode(dictionary, handler(), data, index)
      : prepareScalar(handler, data, index)
    jindex--
  }
  return index
}

const dict = [
  { kind: SCALAR, name: 'scalar' },
  { kind: VECTOR, name: 'vector' },
  { kind: LIST ^ SCALAR, name: 'scalarList' },
  { kind: LIST ^ VECTOR, name: 'vectorList' },
  { kind: SCALAR ^ ARGUMENT, name: 'scalar_arg' },
  { kind: VECTOR ^ ARGUMENT, name: 'vector_arg' },
]

decodeInputObject()