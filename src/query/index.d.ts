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

interface Decoder<Vector, List> {
  vector: VectorHandler<Vector>
  list?: ListHandler<List>
}

type VectorHandler<T> = () => VectorAccumulator<T>

interface VectorAccumulator<T> {
  accumulate: (key: string) => KeyHandler<any>
  commit: () => T
}

interface KeyHandler<T> {
  addValue: (value: T) => void
  addArg?: (key: string) => void
  addDirective?: (key: string) => void
  commit?: () => T
}

type ListHandler<T> = () => ListAccumulator<T>

interface ListAccumulator<T> {
  accumulate: (value: any) => void
  commit: () => T
}

export enum Config {
  SCALAR = 0,
  VECTOR = 1 << 0,
  ARGUMENT = 1 << 1,
  LIST = 1 << 2,
  INPUT = 1 << 3,
  HAS_ARGUMENTS = 1 << 4
}

type Variables = Map<number, string>

type Context = {
  variables: Variables
}

type ByteIterator = Iterator<number>

interface Iterator<T> {
  take: () => T
  atEnd: () => boolean
  current: () => T
}

interface DictionaryInterface {
  name: string
  config: Config
}

interface DictionaryScalar<T extends any> extends DictionaryInterface {
  handler: TypeHandler<T>
}

interface DictionaryVector extends DictionaryInterface {
  fields: DictionaryEntry[]
}

interface DictionaryList extends DictionaryInterface {
  nesting: number
}

type DictionaryUnaryEntry = DictionaryScalar<any> | DictionaryVector
type DictionaryListEntry = DictionaryListScalar<any> | DictionaryListVector

type DictionaryEntry = DictionaryUnaryEntry | DictionaryListEntry

interface DictionaryListVector extends DictionaryList {
  ofType: DictionaryScalar<any> | DictionaryVector
}

interface DictionaryListScalar<T extends any>
  extends DictionaryList,
    DictionaryScalar<T> {}

interface TypeHandler<T extends any> {
  encode: (data: T) => Uint8Array
  decode: (data: ByteIterator) => T
}
