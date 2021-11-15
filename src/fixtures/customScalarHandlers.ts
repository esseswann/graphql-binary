import { ByteIterator } from '../iterator'
import { ScalarHandlers } from '../scalarHandlers'

const length = 4

const customScalarHandlers: ScalarHandlers = {
  UDateS: {
    decode: (data: ByteIterator) => {
      const subset = data.take(length)
      const view = new DataView(subset.buffer)
      return new Date(view.getInt32(0) * 1000)
    },
    encode: (data: Date) => {
      const timestampSeconds = data.getTime() / 1000
      return new Uint8Array([
        (timestampSeconds & 0xff000000) >> 24,
        (timestampSeconds & 0x00ff0000) >> 16,
        (timestampSeconds & 0x0000ff00) >> 8,
        timestampSeconds & 0x000000ff
      ])
    }
  }
}

export default customScalarHandlers