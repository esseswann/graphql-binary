import capitalize from 'capitalize'

import { stringType } from 'types'

// import { decodeValue } from 'valueHandlers'
import * as ast from './ast'
import * as queryTypes from './queryTypes'

const END = 255
const ASCII_OFFSET = 65

const decode = (
  bytes,
  dictionary
) => {
  let index = 0
  
  const {
    operation,
    hasName,
    hasVariables,
    // hasDirectives
  } = queryTypes.decode(bytes[index])

  index += 1

  let result

  if (hasName) {
    const [name, offset] = stringType.decode(index, bytes)
    index = offset
    result = ast.OPERATION(operation, name)
  } else
    result = ast.OPERATION(operation)

  let callback
  if (hasVariables) {
    // Variable type is determined from the first encountered occurence
    // There might be more performant data structres
    const varaiblesNames = new Map()

    let currentVariableIndex = 0
    // GraphQL spec prohibits using Ints in variable names
    let currentVariableChar = 'A'
  
    while (bytes[index] !== END) {
      // This code looks geh
      while (bytes[index] !== END) {
        varaiblesNames.set(bytes[index], currentVariableChar)
        index += 1
      }
      index += 1
      currentVariableIndex += 1
      currentVariableChar = String.fromCharCode(currentVariableIndex + ASCII_OFFSET)
    }
    index += 1
    let headerLength = index
    callback = (currentIndex, type) => {
      const variableName = varaiblesNames.get(currentIndex - headerLength)
      if (variableName) {
        const variablesDefinitionsIndex = variableName.charCodeAt(0) - ASCII_OFFSET
        if (!result.definitions[0].variableDefinitions[variablesDefinitionsIndex])
          result.definitions[0].variableDefinitions[variablesDefinitionsIndex] = 
            ast.VARIABLE_DEFINITION(variableName, type)
        return [variableName, currentIndex + 1]
      } else 
        // Explicitly retrun null to indicate that variable is not used
        return null
    }
  }

  const [fields] = decodeFields(bytes, dictionary, capitalize(operation), [], index, callback)
  result.definitions[0].selectionSet.selections = fields
    
  return {
    query: result,
    variables: null
  }
}

const decodeFields = (
  bytes,
  dictionary,
  parentKey,
  accumulator,
  index,
  callback
) => {
  if (bytes[index] === END)
    // FIXME doing this twice is wrong
    return [accumulator, index + 1]
  const [field, offset] = decodeField(bytes, dictionary, parentKey, index, callback)
  accumulator.push(field)

  if (field.selectionSet && bytes[index + 1] === END)
    // FIXME should use graphql-js error
    throw new Error(
      `Field ${field.name.value} of type ${field.name.kind} must have a subselection of fields`
    )

  return decodeFields(bytes, dictionary, parentKey, accumulator, offset, callback)
}

export const decodeField = (
  bytes,
  dictionary,
  parentKey,
  index = 0,
  callback
) => {
  const definition = dictionary[parentKey].decode[bytes[index]]
  if (definition === undefined)
    throw new Error(`Code ${bytes[index]} not present in schema`)

  const result = ast[definition.listKind || definition.kind](definition.name)

  index += 1
  function subFields() {
    // FIXME this is a bad implementation
    const next = dictionary[parentKey].decode[bytes[index]]
    if (next && next.isArg) {
      // Callback result means that variable is used
      const callbackResult = callback && callback(index, next.type)
      if (callbackResult) {
        const [variableName, offset] = callbackResult
        result.arguments.push(ast.ARGUMENT_WITH_VARIABLE(next.name, variableName))
        index = offset
      } else {
        const [value, offset] = next.typeHandler.decode(index + 1, bytes)
        result.arguments.push(ast.ARGUMENT(next.name, next.typeHandler.astName, value))
        index = offset
      }

      return subFields()
    } else if (definition.kind === 'OBJECT') {
      const [fields, offset] = decodeFields(
        bytes,
        dictionary,
        definition.type,
        result.selectionSet.selections,
        index,
        callback
      )
      index = offset
    }
    return
  }
  subFields()
  return [result, index]
}

export default decode
