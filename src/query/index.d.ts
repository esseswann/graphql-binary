export const MIN_LENGTH = 3
export const END = 255
export const ASCII_OFFSET = 65

import { DocumentNode, TypeNode } from 'graphql/language/ast'

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

type DecodeResult = {
  document: DocumentNode
  // variables: object
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
  addArg?: (key: string, variableName: string) => void
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
  HAS_ARGUMENTS = 1 << 4,
  NON_NULL = 1 << 5
}

// type Variables = Map<number, string>

// type Context = {
//   variables: Variables
// }

interface VariablesHandler<T> {
  accumulate: AccumulateVariables
  commit: () => T
}

type AccumulateVariables = (key: string, type: TypeNode) => void
