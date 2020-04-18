import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import { encodeValue } from 'valueHandlers'

const END = 255

function encode(definition, dictionary) {
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
      encodeValue(argumentDefinition.type, argument.value.value, result)
    })
  }

  if (field.selectionSet)
    encodeFields(field, dictionary, definition.type, result)
}

export default encode