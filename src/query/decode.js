import capitalize from 'capitalize'

// import { decodeValue } from 'valueHandlers'
import * as ast from './ast'
import * as queryTypes from './queryTypes'

const END = 255

const decode = (
  bytes,
  dictionary
) => {

  const {
    operation,
    hasName,
    hasVariables,
    // hasDirectives
  } = queryTypes.decode(bytes[0])

  const result = ast.OPERATION(operation)
  result.definitions[0].selectionSet.selections =
    decodeFields(bytes, dictionary, capitalize(operation), [], 1)
  return result
}

const decodeFields = (
  bytes,
  dictionary,
  parentKey,
  accumulator,
  index,
  ...rest
) => {
  if (bytes[index] === END)
    // FIXME doing this twice is wrong
    return [accumulator, index + 1]
  const [field, offset] = decodeField(bytes, dictionary, parentKey, index)
  accumulator.push(field)

  if (field.selectionSet && bytes[index + 1] === END)
    // FIXME should use graphql-js error
    throw new Error(
      `Field ${field.name.value} of type ${field.name.kind} must have a selection of subfields`
    )

  return decodeFields(bytes, dictionary, parentKey, accumulator, offset)
}

export const decodeField = (bytes, dictionary, parentKey, index = 0) => {
  const definition = dictionary[parentKey].decode[bytes[index]]
  if (definition === undefined)
    throw new Error(`Code ${bytes[index]} not present in schema`)

  const result = ast[definition.listKind || definition.kind](definition.name)

  index += 1
  function subFields() {
    // FIXME this is a bad implementation
    const next = dictionary[parentKey].decode[bytes[index]]
    if (next && next.isArg) {
      const [value, offset] = next.typeHandler.decode(index + 1, bytes)
      result.arguments.push(ast.ARGUMENT(next.name, next.typeHandler.astName, value))
      index = offset
      return subFields()
    } else if (definition.kind === 'OBJECT') {
      const [fields, offset] = decodeFields(
        bytes,
        dictionary,
        definition.type,
        result.selectionSet.selections,
        index
      )
      index = offset
    }
    return
  }
  subFields()
  return [result, index]
}

export default decode
