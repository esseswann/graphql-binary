export const MIN_LENGTH = 3
export const END = 255

export enum Operation {
  query = 0 << 0,
  mutation = 1 << 1,
  subscription = 1 << 2
}

export enum Flags {
  Name = 1 << 3,
  Variables = 1 << 4,
  Directives = 1 << 5
}

type Dictionary = DictionaryField | DictionaryValue

export enum Config {
  SCALAR = 0,
  VECTOR = 1 << 0,
  ARGUMENT = 1 << 1,
  LIST = 1 << 2
}

interface DictionaryField {
  name: string
  config: Config
  fields: DictionaryField[]
}

interface DictionaryValue {
  name: string
  config: Config
  // type: DictionaryType,
  ofType?: DictionaryValue
  decode?: (data: ByteIterator) => any // FIXME should be
  fields: Array<DictionaryValue>
}

type DictionaryType = {
  name: string
}

type Variables = Map<number, string>

type Context = {
  variables: Variables
}

type ByteIterator = Iterator<number>

interface Iterator<T> {
  take: () => T
  iterateWhileNotEnd: (callback: () => void) => void
}
