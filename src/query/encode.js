import capitalize from 'capitalize'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'

import { stringType } from 'types'

import * as queryTypes from './queryTypes'

const END = 255

function encode({ definitions }, dictionary) {
  if (definitions.length > 1)
    throw new Error('Multiple operations per request are not supported')
  
  const [definition] = definitions
  
  let result = [queryTypes.encode({
    operation: definition.operation,
    hasName: !!definition.name,
    hasVariables: definition.variableDefinitions?.length > 0 
  })]

  if (definition.name)
    result = [...result, ...stringType.encode(definition.name.value)]

  encodeFields(definition, dictionary, capitalize(definition.operation), result)
  return new Uint8Array(result)
}

function encodeFields(definition, dictionary, parentKey, result) {
  forEach(definition.selectionSet.selections, (field) =>
    encodeField(field, dictionary, parentKey, result)
  )
  result.push(END)
}

function encodeField(field, dictionary, parentKey, result) {
  const definition = dictionary[parentKey].encode[field.name.value]

  if (!definition)
    throw new Error(`Field ${field.name.value} is not present in the schema`)
  else result.push(definition.byte)

  if (field.arguments.length > 0) {
    if (isEmpty(definition.arguments))
      throw new Error(`Field ${field.name.value} should not have arguments`)

    forEach(field.arguments, (argument) => {
      const argumentDefinition = definition.arguments[argument.name.value]
      if (argumentDefinition === undefined)
        throw new Error(
          `Argument ${argument.name.value} for field ${field.name.value} is not present in the schema`
        )

      result.push(argumentDefinition.byte)
      const value = argumentDefinition.typeHandler.encode(argumentDefinition.typeHandler.parse(argument.value.value))
      value.forEach(value => result.push(value))
    })
  }

  if (field.selectionSet)
    encodeFields(field, dictionary, definition.type, result)
}

export default encode
