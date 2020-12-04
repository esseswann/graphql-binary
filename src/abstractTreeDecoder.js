// This is an R&D code don't use anything directly
import util from 'util'

function toBinary(n){
  let binary = "";
  if (n < 0) {
    n = n >>> 0;
  }
  while(Math.ceil(n/2) > 0){
      binary = n%2 + binary;
      n = Math.floor(n/2);
  }
  return binary;
}

const END = 255
const SCALAR   = 0b0
const VECTOR   = 0b1
const ARGUMENT = 0b100
const LIST     = 0b10

const argument = {
  object: (callback) => {
    const object = {
      kind: 'ObjectValue',
      fields: []
    }
    callback(object)
    return (key) => (value) => 
      object.fields.push({
        kind: 'ObjectField',
        name: { kind: 'Name', value: key },
        value
      })
  },
  list: (callback) => {
    const list = {
      kind: 'ListValue',
      values: []
    }
    callback(list)
    return (value) => list.values.push(value)
  },
  scalar: (kind, value) => ({
    kind,
    value: typeof value === 'string'
      ? value
      : JSON.stringify(value)
    })
}

const argumentHandler = (callback, kind) => {

  if (LIST & kind)
    callback = argument.list(callback)

  if (VECTOR & kind) {
    if (LIST & kind) {
      return () => {
        const localCallback = argument.object(callback)
        return (key, kind) => argumentHandler(localCallback(key), kind)
      }
    } else {
      return (key, kind) =>
        argumentHandler(argument.object(callback)(key), kind)
    }
  } else { // SCALAR
    return (kind, value) =>
      callback(argument.scalar(kind, value))
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

const data = [0, 1, 5, 3, 7, 7, 7, 4, 1, 7, 1, 4, 1, 255, 255, 0, 255, 255]

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
  { kind: ARGUMENT ^ LIST ^ SCALAR, name: 'list_scalar_arg' },
  { kind: ARGUMENT ^ SCALAR, name: 'vector_arg' },
  { kind: ARGUMENT ^ LIST ^ VECTOR, name: 'list_vector_arg' },
]

decodeInputObject()