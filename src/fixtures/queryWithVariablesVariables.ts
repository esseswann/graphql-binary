import { WithVariablesQueryVariables, Enumerable } from '.'

const preparedVariables: WithVariablesQueryVariables = {
  A: 1,
  B: 2.5,
  C: true,
  D: 'test',
  E: Enumerable.First,
  F: {
    inputMap: {
      int: 123,
      // FIXME [1, 2, 3, 4, 5, 255]
      inputListScalar: [1, 2, 3, 4, 2],
      inputListMap: [
        {
          int: 123,
          inputListScalar: [1, 2, 3, 4]
        }
      ]
    }
  }
}

export default preparedVariables