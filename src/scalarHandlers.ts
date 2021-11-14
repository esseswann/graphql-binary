import { ByteIterator } from './iterator'
import { decodeVarInt, encodeVarInt } from './varint'
import { TextEncoder, TextDecoder } from 'util' // FIXME should use some crossplatform solution
import mergeArrays from './mergeArrays'

export type ScalarHandlers = {
  [key: string]: ScalarHandler<any>
}

interface ScalarHandler<T> {
  encode: (data: T) => Uint8Array
  decode: (data: ByteIterator) => T
}

const scalarHandlers: ScalarHandlers = {
  Int: {
    encode: encodeVarInt,
    decode: decodeVarInt
  },
  Float: {
    encode: (data: number) => {
      const array = new Float32Array(1) // FIXME we need to make precision variable
      array[0] = data
      return new Uint8Array(array.buffer)
    },
    decode: (data: ByteIterator) => {
      const takenData = data.take(4)
      const view = new DataView(takenData.buffer)
      return view.getFloat32(0, true)
    }
  },
  String: {
    encode: (data: string) => {
      const textEncoder = new TextEncoder()
      const result = textEncoder.encode(data)
      return mergeArrays(encodeVarInt(result.length), result)
    },
    decode: (data: ByteIterator) => {
      const length = decodeVarInt(data)
      const textDecoder = new TextDecoder()
      // FIXME this is probably incorrect
      const result = textDecoder.decode(data.take(length))
      return result
    }
  },
  Boolean: {
    encode: (data: boolean) => new Uint8Array([data ? 1 : 0]),
    decode: (data) => !!data.take()
  },
  ID: {
    encode: (data: string) => new Uint8Array([]),
    decode: (data) => 'id'
  }
}

export default scalarHandlers