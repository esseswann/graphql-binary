import { Kind } from 'graphql'
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
              kind: Kind.ARGUMENT,
              value: {
                kind: Kind.VARIABLE,
                name: {
                  kind: Kind.NAME,
                  value: variableName
                }
              },
              name: {
                kind: Kind.NAME,
                value: key
              }
            }),
          commit: () =>
            accumulator.push({
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: key
              },
              ...(args.length && { arguments: args }),
              ...(selectionSet && { selectionSet })
            })
        }
      },
      commit: (): SelectionSetNode => ({
        kind: Kind.SELECTION_SET,
        selections: accumulator
      })
    }
  },
  variables: () => {
    const accumulator: Array<VariableDefinitionNode> = []
    return {
      accumulate: (key, type) =>
        accumulator.push({
          kind: Kind.VARIABLE_DEFINITION,
          type: type,
          variable: {
            kind: Kind.VARIABLE,
            name: {
              kind: Kind.NAME,
              value: key
            }
          }
        }),
      commit: () => accumulator
    }
  }
}
