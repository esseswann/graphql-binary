// This is an R&D code don't use anything directly
import util from 'util'

export const END      = 255
export const SCALAR   = 0b0
export const VECTOR   = 0b1
export const LIST     = 0b10
export const ARGUMENT = 0b100

const argument = {
  object: (callback) => {
    const object = {
      kind: 'ObjectValue',
      fields: []
    }
    callback(object)
    return (name) => (value) => 
      object.fields.push({
        kind: 'ObjectField',
        name: { kind: 'Name', value: name },
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

const json = {
  object: (callback) => {
    const object = {}
    callback(object)
    return (name) => (value) => object[name] = value
  },
  list: (callback) => {
    const list = []
    callback(list)
    return (value) => list.push(value)
  },
  scalar: (kind, value) => value
}

const handlerGenerator = (dictionary) => function handler(callback, kind) {

  if (LIST & kind)
    callback = dictionary.list(callback)

  if (VECTOR & kind) {
    if (LIST & kind) {
      return () => {
        const localCallback = dictionary.object(callback)
        return (name, kind) => handler(localCallback(name), kind)
      }
    } else {
      return (name, kind) =>
        handler(dictionary.object(callback)(name), kind)
    }
  } else { // SCALAR
    return (kind, value) =>
      callback(dictionary.scalar(kind, value))
  }
}

export const argumentHandler = handlerGenerator(argument)
export const jsonHandler = handlerGenerator(json)

export const queryHandler = (target) => (name, kind) => {

  const object = { name: { kind: 'Name', value: name } }
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

export const decode = (
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
    console.log(data, dictionary[current], current)
    const { myKind: kind, name } = dictionary[current]
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

// const dict = [
//   { kind: SCALAR, name: 'scalar' },
//   { kind: VECTOR, name: 'vector' },
//   { kind: LIST ^ SCALAR, name: 'scalarList' },
//   { kind: LIST ^ VECTOR, name: 'vectorList' },
//   { kind: SCALAR ^ ARGUMENT, name: 'scalar_arg' },
//   { kind: ARGUMENT ^ LIST ^ SCALAR, name: 'list_scalar_arg' },
//   { kind: ARGUMENT ^ SCALAR, name: 'vector_arg' },
//   { kind: ARGUMENT ^ LIST ^ VECTOR, name: 'list_vector_arg' },
// ]