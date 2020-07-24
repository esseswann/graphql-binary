import isBoolean from 'lodash/fp/isBoolean'
import isString from 'lodash/fp/isString'

export const OPERATION = (operation = 'query', name) => ({
  kind: 'Document',
  definitions: [{
    operation,
    kind: 'OperationDefinition',
    variableDefinitions: [],
    directives: [],
    selectionSet: {
      kind: 'SelectionSet',
      selections: []
    },
    ...name && {
      name: {
        kind: 'Name',
        value: name,
      }
    }
  }]
})

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
