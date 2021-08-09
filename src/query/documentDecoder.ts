import {
  ArgumentNode,
  FieldNode,
  SelectionSetNode,
  VariableDefinitionNode
} from 'graphql/language/ast'
import { QueryDecoder } from './types'

export const documentDecoder: QueryDecoder<
  SelectionSetNode,
  Array<VariableDefinitionNode>
> = {
  vector: () => {
    const accumulator: Array<FieldNode> = []
    return {
      accumulate: (key) => {
        const args: Array<ArgumentNode> = []
        let selectionSet: SelectionSetNode
        return {
          addValue: (value) => (selectionSet = value),
          addArg: (key, variableName) =>
            args.push({
              kind: 'Argument',
              loc: undefined,
              value: {
                kind: 'Variable',
                loc: undefined,
                name: {
                  kind: 'Name',
                  value: variableName,
                  loc: undefined
                }
              },
              name: {
                kind: 'Name',
                value: key,
                loc: undefined
              }
            }),
          commit: () =>
            accumulator.push({
              kind: 'Field',
              alias: undefined, // FIXME probably should handle
              directives: [],
              name: {
                kind: 'Name',
                loc: undefined,
                value: key
              },
              ...(args.length && { arguments: args }),
              ...(selectionSet && { selectionSet }),
              loc: undefined
            })
        }
      },
      commit: (): SelectionSetNode => ({
        kind: 'SelectionSet',
        selections: accumulator,
        loc: undefined
      })
    }
  },
  variables: () => {
    const accumulator: Array<VariableDefinitionNode> = []
    return {
      accumulate: (key, type) =>
        accumulator.push({
          kind: 'VariableDefinition',
          type: type,
          loc: undefined,
          directives: [], // FIXME requires support
          defaultValue: undefined, // FIXME requires support
          variable: {
            kind: 'Variable',
            loc: undefined,
            name: {
              kind: 'Name',
              value: key,
              loc: undefined
            }
          }
        }),
      commit: () => accumulator
    }
  }
}
