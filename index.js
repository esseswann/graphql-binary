import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'
import reduce from 'lodash/reduce'
import set from 'lodash/set'
import { getNamedType } from 'graphql'
import { decodeValue, encodeValue } from './valueHandlers'
import * as ast from './ast'

const END = 255

export const encode = (definition, parent, result = []) => {
  forEach(definition.selectionSet.selections, field =>
    encodeField(field, parent, result))
  result.push(END)
  return new Uint8Array(result)
}

export function encodeField(field, parent, result) {
  const definition = parent[field.name.value]

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
}

export const decode = (
  bytes,
  dictionary,
  accumulator = [],
  index = 0
) => {
  if (bytes[index] === END) // FIXME doing this twice is wrong
    return accumulator
  const [field, offset] = decodeField(bytes, dictionary, index)
  accumulator.push(field)

  return decode(bytes, dictionary, accumulator, offset)
}

export const decodeField = (
  bytes,
  dictionary,
  index = 0,
) => {
  const definition = dictionary[bytes[index]]
  if (definition === undefined)
    throw new Error(`Code ${bytes[0]} not present in schema`)

  const result = ast[definition.type](definition.key)
  index += 1
  
  let hasArg = true
  while (hasArg) {

    if (bytes[index] === END)
      return [result, index]

    const arg = dictionary[bytes[index]]

    if (arg === undefined)
      throw new Error(`Code ${bytes[0]} not present in schema`)

    if (arg.type === 'argument') {
      if (arg.parent !== definition.key)
        throw new Error(`Invalid argument ${arg.name} for ${definition.key}`)
      index += 1
      const [value, offset] = decodeValue(bytes, index, arg.kind)
      result.arguments.push(ast[arg.type](arg.key, arg.kind, value))
      index = offset - 1  // FIXME this is bad
    } else
      hasArg = false
  }
  return [result, index]
} 

export const generateDictionaries = ({ data }) =>
  reduce(data.__schema.types, typeReducer, { encode: {}, decode: {} })

const typeReducer = (
  result,
{
  name,
  kind,
  enumValues,
  fields,
}) => {
  if (!name.match('__') && (kind === 'OBJECT' || kind === 'LIST')) {
    if (!result.decode[name])
      result.decode[name] = []

    if (!result.encode[name])
      result.encode[name] = {}

    const encodeWithList = ({ type, ...field }) =>
      result.decode[name].push({
        name: field.name,
        ...type.kind === 'LIST'
          ? { kind: type.ofType.kind, type: type.ofType.name  }
          : { kind: type.kind, type: type.name }
      })
 
    forEach(fields, field => {
      encodeWithList(field)
      result.encode[name][field.name] = {
        byte: result.decode[name].length - 1
      }
      if (field.args.length > 0)
        forEach(field.args, arg => {
          result.encode[name][field.name][arg.name] = {
            byte: result.decode[name].length - 1
          }
          encodeWithList(arg)
        })
    })
  }

  return result
}
  // reduce(fields, generateDictionariesReducer, { encode: {}, decode: [] })

const generateDictionariesReducer = (result, field) => {
  result.decode.push({
    key: field.name,
    type: 'field'
  })

  result.encode[field.name] = {
    byte: result.decode.length - 1
  }

  if (field.args.length > 0)
    forEach(field.args, arg => {
      result.decode.push({
        key: arg.name,
        type: 'argument',
        kind: arg.type.name,
        parent: field.name
      })
      set(result, ['encode', field.name, 'arguments', arg.name], {
        byte: result.decode.length - 1,
        kind: arg.type.name
      })
    })
  return result
}