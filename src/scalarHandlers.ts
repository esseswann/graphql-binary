import { ByteIterator } from './iterator'

export type ScalarHandlers = {
  [key: string]: ScalarHandler<any>
}

interface ScalarHandler<T> {
  encode: (data: T) => Uint8Array
  decode: (data: ByteIterator<number>) => T
}

const scalarHandlers: ScalarHandlers = {
  Int: {
    encode: (data: number) => new Uint8Array([data]),
    decode: (data) => data.take()
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
