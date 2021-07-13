import {
  ArgumentNode,
  FieldNode,
  SelectionSetNode,
  TypeNode,
  VariableDefinitionNode,
  NonNullTypeNode
} from 'graphql/language/ast'
import { Decoder, VariablesHandler } from './index.d'

export const documentDecoder: Decoder<SelectionSetNode, FieldNode> = {
  vector: () => {
    const accumulator: Array<FieldNode> = []
    return {
      commit: () => ({
        kind: 'SelectionSet',
        selections: accumulator
      }),
      accumulate: (key) => {
        let args: Array<ArgumentNode>
        let selectionSet: SelectionSetNode
        return {
          commit: () =>
            accumulator.push({
              kind: 'Field',
              name: {
                kind: 'Name',
                value: key
              },
              ...(args && { arguments: args }),
              ...(selectionSet && { selectionSet })
            }),
          addValue: (value) => (selectionSet = value),
          addArg: (key, variableName) =>
            (args || (args = [])).push({
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
            })
        }
      }
    }
  }
}

export function variablesHandler(): VariablesHandler<
  Array<VariableDefinitionNode>
> {
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
