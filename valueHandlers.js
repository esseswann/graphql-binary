import slice from 'lodash/slice'
import concat from 'lodash/concat'
import isString from 'lodash/isString'
import isNull from 'lodash/isNull'
import isBoolean from 'lodash/isBoolean'
import msgPack from '@msgpack/msgpack'

export const decodeValue = (bytes, index, type) => {
  const length = bytes[index]
  index += 1
  const end = index + length
  const value = msgPack.decode(slice(bytes, index, end))
  return [value, end + 1, typeof value] // FIXME should use availableTypes
}

export const encodeValue = (type, value, result) => {
  const availableType = availableTypes[type]

  if (!availableType)
    throw new Error(`Unknown type: ${type}`)

  if (!availableType.check(value))
    throw new Error(`Expected type ${type}, found ${value}`)

  
  value = availableType.parse(value)
  const encodedValue = msgPack.encode(value)
  result.push(encodedValue.length)
  encodedValue.forEach(value => result.push(value)) // FIXME find a way not to use extra byte
}

const availableTypes = {
  Int: {
    astName: 'IntValue',
    check: value => !isNaN(value) && !value.match(/\D/),
    parse: value => parseInt(value, 10)
  },
  Float: {
    astName: 'FloatValue',
    check: n => Number(n) === n && n % 1 !== 0,
    parse: value => parseFloat(value, 10)
  },
  String: {
    astName: 'StringValue',
    check: isString,
    parse: value => value
  },
  BOOLEAN: {
    astName: 'BooleanValue',
    check: isBoolean,
    parse: value => !!value
  },
  NULL: {
    astName: 'NullValue',
    check: isNull,
    parse: () => null
  },
  ENUM: {
    astName: 'EnumValue',
    // TODO enum checks
    check: () => true
  },
  LIST: {
    astName: 'ListValue',
    check: () => true
  }, // Unsupported yet
  OBJECT: {
    astName: 'ObjectValue',
    check: () => true
  }, // Use structured object
  OBJECT_FIELD: {
    astName: 'ObjectField',
    check: () => true
  }, // Not neccesary?
}

const types = {
  Int: {
    decode: (bytes, index) => {
      const value = bytes[index]
      const offset = index + 1
      return [value, offset]
    },
    encode: (value, result) => {
      const encodedValue = parseInt(value, 10)
      result.push(encodedValue)
    }
  }
}