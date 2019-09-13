export const SCALAR = name => ({
  kind: 'Field',
  arguments: [],
  directives: [],
  name: { kind: 'Name', value: name }
})

export const OBJECT = name => ({
  ...SCALAR(name),
  selectionSet: {
    kind: 'SelectionSet',
    selections: []
  }
})

export const ARGUMENT = (name, kind, value) => ({
  kind: 'Argument',
  name: { kind: 'Name', value: name },
  value: { kind, value }
})