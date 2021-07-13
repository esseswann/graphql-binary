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
    accumulate: (
      key: string,
      typeName: string,
      isNonNull: boolean,
      listConfig: Array<boolean>
    ) => {
      let typeNode: TypeNode = {
        kind: 'NamedType',
        name: {
          kind: 'Name',
          value: typeName
        }
      }
      if (isNonNull) typeNode = envelopeInNonNull(typeNode)
      return () =>
        accumulator.push({
          kind: 'VariableDefinition',
          type: iterateOverVariableType(listConfig, typeNode),
          variable: {
            kind: 'Variable',
            name: {
              kind: 'Name',
              value: key
            }
          }
        })
    },
    commit: () => accumulator
  }
}

function iterateOverVariableType(
  listConfig: Array<boolean>,
  acc: TypeNode,
  index: number = listConfig.length - 1
): TypeNode {
  if (index < 0) return acc
  let typeNode: TypeNode = { kind: 'ListType', type: acc }
  if (listConfig[index]) typeNode = envelopeInNonNull(typeNode)
  return iterateOverVariableType(listConfig, typeNode, index - 1)
}

function envelopeInNonNull(type: NonNullTypeNode['type']): NonNullTypeNode {
  return {
    kind: 'NonNullType',
    type: type
  }
}
