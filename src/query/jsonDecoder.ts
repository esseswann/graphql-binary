import { DataDecoder } from './index.d'

const jsonDecoder: DataDecoder<Object, Array<any>, any> = {
  list: () => {
    const accumulator = []
    return {
      accumulate: (value) => accumulator.push(value),
      commit: () => accumulator
    }
  },
  vector: () => {
    const accumulator = {}
    return {
      accumulate: (key) => ({
        addValue: (value) => (accumulator[key] = value)
      }),
      commit: () => accumulator
    }
  }
}

export default jsonDecoder
