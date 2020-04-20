// import slice from 'lodash/slice'
// import concat from 'lodash/concat'
import isString from 'lodash/isString'
import isNull from 'lodash/isNull'
import isBoolean from 'lodash/isBoolean'
import { TextEncoder } from 'util'

const stringType = {
  astName: 'StringValue',
  check: isString,
  parse: (value) => value,
  encode: (data) => {
    const textEncoder = new TextEncoder()
    const result = textEncoder.encode(data)
    return new Uint8Array([result.length, ...result])
  },
  decode: (offset, data) => {
    // FIXME this should allow variable string length, now it's 255
    const result = String.fromCharCode.apply(
      null,
      data.slice(offset + 1, offset + 1 + data[offset])
    )
    return [result, offset + result.length + 1] // Why do I need to add this 1?
  },
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
