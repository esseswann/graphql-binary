// import slice from 'lodash/slice'
// import concat from 'lodash/concat'
import isString from 'lodash/isString'
import isNull from 'lodash/isNull'
import isBoolean from 'lodash/isBoolean'

export default {
  Int: {
    astName: 'IntValue',
    check: value => !isNaN(value) && isString(value) && !value.match(/\D/),
    parse: value => parseInt(value, 10),
    encode: data => new Uint8Array([
      (data & 0xff000000) >> 24,
      (data & 0x00ff0000) >> 16,
      (data & 0x0000ff00) >> 8,
      (data & 0x000000ff)
    ]),
    decode: (offset, data) => [new Uint32Array(data.slice(offset, 4))[0], 4]
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
  Boolean: {
    astName: 'BooleanValue',
    check: isBoolean,
    parse: value => !!value
  },
  Null: {
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