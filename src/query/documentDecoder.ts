import {
  ArgumentNode,
  FieldNode,
  SelectionSetNode,
  VariableDefinitionNode
} from 'graphql/language/ast'
import { QueryDecoder } from './index.d'

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
              value: {
                kind: 'Variable',
                name: {
                  kind: 'Name',
                  value: variableName
                }
              },
              name: {
                kind: 'Name',
                value: key
              }
            }),
          commit: () =>
            accumulator.push({
              kind: 'Field',
              name: {
                kind: 'Name',
                value: key
              },
              ...(args.length && { arguments: args }),
              ...(selectionSet && { selectionSet })
            })
        }
      },
      commit: (): SelectionSetNode => ({
        kind: 'SelectionSet',
        selections: accumulator
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
          variable: {
            kind: 'Variable',
            name: {
              kind: 'Name',
              value: key
            }
          }
        }),
      commit: () => accumulator
    }
  }
}
