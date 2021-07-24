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

export type DecodeResult = {
  document: DocumentNode
  variables: object | undefined
}

export interface QueryDecoder<Vector, Variable> {
  vector: () => VectorHandler<Vector, QueryKeyHandler<Vector>>
  variables: () => VariablesHandler<Variable>
}

export interface QueryKeyHandler<T> extends KeyHandler<T> {
  addArg: (key: string, type: any) => void
  addDirective?: (key: string, type: any) => void
  commit: () => void
}

export interface VariablesHandler<T> {
  accumulate: AccumulateVariables
  commit: () => T
}

export type AccumulateVariables = (key: string, type: TypeNode) => void

export interface VectorHandler<T, KeyHandler> {
  accumulate: (key: string) => KeyHandler
  commit: () => T
}

export interface DataDecoder<Vector, List, Value> {
  vector: () => VectorHandler<Vector, KeyHandler<Value>>
  list: () => ListHandler<List>
}

export interface KeyHandler<T> {
  addValue: (value: T) => void
}

export interface ListHandler<T> {
  accumulate: (value: any) => void
  commit: () => T
}

export type EncodeResult<Result, Variables> =
  | VariablesEncoder<Result, Variables>
  | EncodedQueryWithHandler<Result>

export type VariablesEncoder<Result, Variables> = (
  variables: Variables
) => EncodedQueryWithHandler<Result>

export interface EncodedQueryWithHandler<Result> {
  query: Uint8Array
  handleResponse: (data: Uint8Array) => Result
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
