import isString from 'lodash/fp/isString'
import isBoolean from 'lodash/fp/isBoolean'

export const SCALAR = (name) => ({
  kind: 'Field',
  name: { kind: 'Name', value: name },
  arguments: [],
  directives: [],
})

export const OBJECT = (name) => ({
  ...SCALAR(name),
  selectionSet: {
    kind: 'SelectionSet',
    selections: [],
  }
})

export const ARGUMENT = (name, kind, value) => ({
  kind: 'Argument',
  name: { kind: 'Name', value: name },
  value: {
    kind,
    value: isString(value) || isBoolean(value) ? value : JSON.stringify(value),
    ...(kind === 'StringValue' && { block: false }),
  },
})
