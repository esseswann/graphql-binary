import entries from 'lodash/fp/entries'
import reduce from 'lodash/fp/reduce'

const types = [
  'query',
  'mutation',
  'subscription'
]

const bools = [
  'hasName',
  'hasVariables',
  'hasDirectives'
]

const encodeTypes = new Map()
const decodeTypes = new Map()

types.forEach((type, index) => {
  const mask = index + 1 // 0 is reserved
  encodeTypes.set(type, mask)
  decodeTypes.set(mask, type)
})

bools.forEach((type, index) =>
  encodeTypes.set(type, (2 ** index) << 2)) // First two bits are types

export const encode = ({ operation, ...settings }) => {
  const operationMask = encodeTypes.get(operation)
  if (!operationMask) 
    throw new Error(`Unknown operation ${operation}`)
  else
    return reduce(encodeReducer, operationMask, entries(settings))
}

const encodeReducer = (result, [key, value]) => {
  if (value) {
    const boolMask = encodeTypes.get(key)
    if (boolMask)
      result |= boolMask
    else
      throw new Error(`Unknown operation flag ${key}`)
  }
  return result
}

export const decode = byte => {
  if (byte === 0)
    throw new Error('Unknown operation at index 0')
  return reduce((result, key) => ({
    ...result,
    [key]: !!(encodeTypes.get(key) & byte)
  }), {
    operation: decodeTypes.get(byte & 0xFF >> 6),
  }, bools)
}