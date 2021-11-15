import { DataDecoder } from './types'

const jsonDecoder: DataDecoder<Object, Array<any>, any> = {
  list: () => {
    const accumulator: Array<any> = []
    return {
      accumulate: (value) => accumulator.push(value),
      commit: () => accumulator
    }
  },
  vector: () => {
    const accumulator: { [key: string]: any } = {}
    return {
      accumulate: (key) => ({
        addValue: (value) => (accumulator[key] = value)
      }),
      commit: () => accumulator
    }
  }
}

export default jsonDecoder
