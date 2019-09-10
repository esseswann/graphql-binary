import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import concat from 'lodash/concat'
import map from 'lodash/map'
import reduce from 'lodash/reduce'
import set from 'lodash/set'
import * as ast from './ast'

const END = 255

export const encode = (definition, keyMap, result = []) => {
  forEach(definition.selectionSet.selections, (field, index) => {
    const name = keyMap[field.name.value]
    if (name !== undefined) {
      result.push(name)
      if (field.arguments.length > 0)
        forEach(field.arguments, argument => {
          const argName = `${field.name.value}:${argument.name.value}:${argument.value.kind}`
          console.log(argName)
          if (argName !== undefined) {
            result.push(argName)
            result.push(argument.value.value) // FIXME Cast to bytes corresponding to type
          } else throw new Error(`Argument ${argument.name.value} is not present in the schema`)
        })
      // if (children = field.selectionSet && field.slectionSet.selections)
      //     result.push(field, keyMap, result)
    } else throw new Error(`Field ${field.name.value} is not present in the schema`)
  })
  result.push(END)
  return new Uint8Array(result)
}

export function encodeField(field, parent, result) {
  const definition = parent[field.name.value]
  if (definition) {
    result.push(definition.byte)
    if (field.arguments.length > 0) {
      if (!isEmpty(definition.arguments)) {
        forEach(field.arguments, argument => {
          const argumentDefinition = definition.arguments[argument.name.value]
          if (argumentDefinition !== undefined) {
            result.push(argumentDefinition.byte),
            cast(result, argumentDefinition.type, argument.value.value)
          } else throw new Error(`Argument ${argument.name.value} for field ${field.name.value} is not present in the schema`)
        })
      } else throw new Error(`Field ${field.name.value} should not have arguments`)
    }
  } else throw new Error(`Field ${field.name.value} is not present in the schema`)
}

const cast = (result, type, value) => result.push(parseInt(value, 10))

export const decode = (byteArray, mapKey) => {
  const recursive = (bytes, index, accumulator, currentFieldWithArgs) => {
    const byte = bytes[index]
    if (byte === END)
      return accumulator
    const next = mapKey[byte]
    if (next !== undefined) {
      const [nextField, nextArg, nextKind] = next.split(':')
      if (nextArg) {
        if (!currentFieldWithArgs) // FIXME probably not neccessary
          currentFieldWithArgs = accumulator[accumulator.length - 1] // FIXME previous might be elsewhere
        currentFieldWithArgs.arguments.push(ast.argument(nextArg, nextKind, 1))
        index += 1 // FIXME increment to skip the value with proper value length
      } else {
        currentFieldWithArgs = null
        accumulator.push(ast.field(next))
      }
      return recursive(bytes, index + 1, accumulator, currentFieldWithArgs)
    } else throw new Error('Not present in scheme')

  }
  return recursive(byteArray, 0, [])
}

export const binaryToStringsReducer = (result, object) =>
  concat(
    result,
    object.name,
    map(object.args, arg => `${object.name}:${arg.name}:${arg.type.name + 'Value'}`))

export const mapBinaryToStrings = input => reduce(input, binaryToStringsReducer, [])

export const mapStringsToBinary = input =>
  reduce(mapBinaryToStrings(input), (result, value, index) => ({  ...result, [value]: index }), {})

export const generateDictionaries = fields =>
  reduce(fields, generateDictionariesReducer, { encode: {}, decode: [] })

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
        parent: field.name
      })
      set(result, ['encode', field.name, 'arguments', arg.name], {
        byte: result.decode.length - 1,
        kind: arg.type.name
      })
    })
  return result
}