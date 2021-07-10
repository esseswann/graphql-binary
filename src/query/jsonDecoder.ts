import { Decoder } from './index.d'

const jsonDecoder: Decoder<Object, Array<any>> = {
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
