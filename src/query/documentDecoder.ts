import { ArgumentNode, FieldNode, SelectionSetNode } from 'graphql/language/ast'
import { Decoder } from './index.d'

const documentDecoder: Decoder<SelectionSetNode, FieldNode> = {
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
          addArg: (key) =>
            (args || (args = [])).push({
              kind: 'Argument',
              value: {
                kind: 'Variable',
                name: {
                  kind: 'Name',
                  value: 'test' // FIXME should propagade to context
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

export default documentDecoder
