import isString from 'lodash/isString'
import isNull from 'lodash/isNull'
import isBoolean from 'lodash/isBoolean'
import { encodeLength, decodeLength } from 'length'
import { TextEncoder } from 'util'

const stringType = {
  astName: 'StringValue',
  check: isString,
  parse: (value) => value,
  encode: (data) => {
    const textEncoder = new TextEncoder()
    const result = textEncoder.encode(data)
    return new Uint8Array([...encodeLength(result.length), ...result])
  },
  decode: (offset, data) => {
    const [length, dataOffset] = decodeLength(data, offset)
    const result = String.fromCharCode.apply(
      null,
      data.slice(dataOffset, dataOffset + length)
    )
    return [result, dataOffset + length]
  },
}

export const generateEnum = (enumValues) => {
  const keys = {}
  const indices = []
  for (let index = 0; index < enumValues.length; index++) {
    const { name } = enumValues[index]
    keys[name] = index
    indices[index] = name
  }
  return {
    astName: 'EnumValue',
    encode: (data) => keys[data]
      ? new Uint8Array([data])
      : new Error(`Enum key ${data} not present in schema`),
    decode: (offset, data) => indices[data[offset]]
      ? [indices[data[offset]], offset + 1]
      : new Error(`Enum index ${data[offset]} not present in schema`),
    parse: (value) => value
    // check: (value) => find(enumValues)
  }
}

export default {
  Int: {
    astName: 'IntValue',
    check: (value) => !isNaN(value) && isString(value) && !value.match(/\D/),
    parse: (value) => parseInt(value, 10),
    encode: (data) =>
      new Uint8Array([
        (data & 0xff000000) >> 24,
        (data & 0x00ff0000) >> 16,
        (data & 0x0000ff00) >> 8,
        data & 0x000000ff,
      ]),
    decode: (offset, data) => {
      const view = new DataView(data.buffer)
      return [view.getInt32(offset), offset + 4]
    },
  },
  Float: {
    astName: 'FloatValue',
    check: (n) => Number(n) === n && n % 1 !== 0,
    parse: (value) => parseFloat(value, 10),
    encode: (data) => {
      const array = new Float64Array(1) // FIXME we need to make precision variable
      array[0] = data
      return new Uint8Array(array.buffer)
    },
    decode: (offset, data) => {
      const view = new DataView(data.buffer)
      // Why getFloat64 is littleEndian while new Float64Array is not?
      return [view.getFloat64(offset, true), offset + 8]
    },
  },
  String: stringType,
  ID: stringType,
  Boolean: {
    astName: 'BooleanValue',
    check: isBoolean,
    parse: (value) => !!value,
    encode: (data) => new Uint8Array([data ? 0 : 1]),
    decode: (offset, data) => [data[offset] === 0, offset + 1],
  },
  Null: {
    astName: 'NullValue',
    check: isNull,
    parse: () => null,
  },
  ENUM: {
    astName: 'EnumValue',
    // TODO enum checks
    check: () => true,
  },
  LIST: {
    astName: 'ListValue',
    check: () => true,
  }, // Unsupported yet
  OBJECT: {
    astName: 'ObjectValue',
    check: () => true,
  }, // Use structured object
  OBJECT_FIELD: {
    astName: 'ObjectField',
    check: () => true,
  }, // Not neccesary?
}
