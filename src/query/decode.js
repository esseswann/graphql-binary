import { decodeValue } from 'valueHandlers'
import * as ast from './ast'

const END = 255

const decode = (
  bytes,
  dictionary,
  parentKey = 'Query',
  accumulator = [],
  index = 0
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

  return decode(bytes, dictionary, parentKey, accumulator, offset)
}

export const decodeField = (bytes, dictionary, parentKey, index = 0) => {
  const definition = dictionary[parentKey].decode[bytes[index]]
  if (definition === undefined)
    throw new Error(`Code ${bytes[index]} not present in schema`)

  const result = ast[definition.kind](definition.name)

  index += 1
  function subFields() {
    // FIXME this is a bad implementation
    const next = dictionary[parentKey].decode[bytes[index]]
    if (next && next.isArg) {
      const [value, offset, kind] = decodeValue(bytes, index + 1, next.type)
      result.arguments.push(ast.ARGUMENT(next.name, kind, value))
      index = offset - 1
      return subFields()
    } else if (definition.kind === 'OBJECT') {
      const [fields, offset] = decode(
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
