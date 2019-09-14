import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import { decodeValue, encodeValue } from './valueHandlers'
import * as ast from './ast'

const END = 255

export const encode = (definition, dictionary) => {
  const result = []
  encodeFields(definition.definitions[0], dictionary, 'Query', result)
  return new Uint8Array(result)
}

function encodeFields(definition, dictionary, parentKey, result) {
  forEach(definition.selectionSet.selections, field =>
    encodeField(field, dictionary, parentKey, result))
  result.push(END)
}

function encodeField(field, dictionary, parentKey, result) {
  const definition = dictionary[parentKey].encode[field.name.value]

  if (!definition)
    throw new Error(`Field ${field.name.value} is not present in the schema`)
  else
    result.push(definition.byte)

  if (field.arguments.length > 0) {
    if (isEmpty(definition.arguments))
      throw new Error(`Field ${field.name.value} should not have arguments`)

    forEach(field.arguments, argument => {
      const argumentDefinition = definition.arguments[argument.name.value]
      if (argumentDefinition === undefined)
        throw new Error(`Argument ${argument.name.value} for field ${field.name.value} is not present in the schema`)

      result.push(argumentDefinition.byte)
      encodeValue(argumentDefinition.kind, argument.value.value, result)
    })
  }

  if (field.selectionSet)
    encodeFields(field, dictionary, definition.type, result)
}

export const decode = (
  bytes,
  dictionary,
  parentKey = 'Query',
  accumulator = [],
  index = 0
) => {
  if (bytes[index] === END) // FIXME doing this twice is wrong
    return [accumulator, index + 1]
  const [field, offset] = decodeField(bytes, dictionary, parentKey, index)
  accumulator.push(field)

  return decode(bytes, dictionary, parentKey, accumulator, offset)
}

export const decodeField = (
  bytes,
  dictionary,
  parentKey,
  index = 0,
) => {
  const definition = dictionary[parentKey].decode[bytes[index]]
  if (definition === undefined)
    throw new Error(`Code ${bytes[0]} not present in schema`)

  const result = ast[definition.kind](definition.name)

  index += 1
  function subFields() { // FIXME this is a bad implementation
    const next = dictionary[parentKey].decode[bytes[index]]
    if (next && next.isArg) {
      const [value, offset] = decodeValue(bytes, index + 1, next.kind)
      result.arguments.push(ast.ARGUMENT(next.name, next.kind, value))
      index = offset - 1
      return subFields()
    }
    else if (definition.kind === 'OBJECT') {
      const [fields, offset] = decode(bytes, dictionary, definition.type, result.selectionSet.selections, index)
      index = offset
    }
    return
  }
  subFields()
  return [result, index]
}