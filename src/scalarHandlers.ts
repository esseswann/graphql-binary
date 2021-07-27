import { ByteIterator } from './iterator'
import { decodeVarInt, encodeVarInt } from './varint'
import { TextEncoder, TextDecoder } from 'util'

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
    encode: (data: number) => new Uint8Array([data]),
    decode: (data) => data.take()
  },
  String: {
    encode: (data: string) => {
      const textEncoder = new TextEncoder()
      const result = textEncoder.encode(data)
      return new Uint8Array([...encodeVarInt(result.length), ...result])
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
