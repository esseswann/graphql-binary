export const field = name => ({
  kind: 'Field',
  arguments: [],
  directives: [],
  name: { kind: 'Name', value: name }
})

export const object = name => ({
  ...field(name),
  selectionSet: {
    kind: 'SelectionSet',
    selections: []
  }
})

export const argument = (name, kind, value) => ({
  kind: 'Argument',
  name: { kind: 'Name', value: name },
  value: { kind, value }
})