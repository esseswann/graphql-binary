import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import {
  DocumentNode,
  OperationTypeNode,
  TypeNode,
  VariableDefinitionNode
} from 'graphql/language/ast'
import defaultScalarHandlers, { ScalarHandlers } from '../scalarHandlers'
import { ByteIterator, createIterator } from '../iterator'
import { documentDecoder } from './documentDecoder'
import {
  ASCII_OFFSET,
  QueryDecoder,
  DecodeResult,
  END,
  Operation,
  VariablesHandler,
  DataDecoder
} from './types'
import jsonDecoder from './jsonDecoder'
import extractTargetType from './extractTargetType'

class Decoder {
  readonly schema: GraphQLSchema
  readonly queryDecoder: QueryDecoder<any, any>
  readonly dataDecoder: DataDecoder<any, any, any>
  readonly scalarHandlers: ScalarHandlers

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.queryDecoder = documentDecoder
    this.dataDecoder = jsonDecoder
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
  }

  decode(data: Uint8Array): DecodeResult {
    const iterator = createIterator(data, END)

    const operation = Operation[iterator.take()] as OperationTypeNode

    const { selectionSet, variableDefinitions } = decodeQuery(
      this,
      this.schema.getType('Query') as GraphQLObjectType,
      iterator,
      this.queryDecoder.variables()
    )

    const hasVariables = variableDefinitions.length

    const document: DocumentNode = {
      kind: 'Document',
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: operation,
          selectionSet: selectionSet,
          ...(hasVariables && { variableDefinitions })
        }
      ]
    }

    return {
      document,
      ...(hasVariables && {
        variables: decodeVariables(this, variableDefinitions, iterator)
      })
    }
  }
}

function decodeQuery(
  decoder: Decoder,
  type: GraphQLObjectType,
  data: ByteIterator,
  variablesHandler: VariablesHandler<any>
) {
  const vector = decoder.queryDecoder.vector()
  const fields = type.astNode?.fields
  if (fields)
    // FIXME should be invariant
    while (!data.atEnd()) {
      const index = data.take()
      const field = fields[index]
      const callbacks = vector.accumulate(field.name.value)

      // Arguments
      if (field.arguments && field.arguments.length > 0)
        while (!data.atEnd()) {
          const arg = field.arguments[data.current() - index - 1]
          if (arg) {
            const variableName = String.fromCharCode(
              variablesHandler.commit().length + ASCII_OFFSET
            )
            callbacks.addArg(arg.name.value, variableName)
            data.take()
            // FIXME direct callback with type definition breaks abstraction gap
            variablesHandler.accumulate(variableName, arg.type)
          } else break
        }

      const typeName = extractTargetType(field.type)
      const fieldType = decoder.schema.getType(typeName)
      if ((fieldType as GraphQLObjectType).getFields)
        callbacks.addValue(
          decodeQuery(
            decoder,
            fieldType as GraphQLObjectType,
            data,
            variablesHandler
          )
        )
      callbacks.commit()
    }
  data.take()
  return {
    selectionSet: vector.commit(),
    variableDefinitions: variablesHandler.commit()
  }
}

function decodeVariables(
  decoder: Decoder,
  dictionary: Array<VariableDefinitionNode>,
  data: ByteIterator
) {
  if (data.current() === undefined)
    throw new Error('Expected variables data for query')
  const vector = decoder.dataDecoder.vector()
  for (let index = 0; index < dictionary.length; index++) {
    const { type, variable } = dictionary[index]
    const { addValue } = vector.accumulate(variable.name.value)
    addValue(decodeValue(decoder, type, data))
  }
  return vector.commit()
}

function decodeValue(decoder: Decoder, type: TypeNode, data: ByteIterator) {
  if (type.kind === 'NonNullType') type = type.type
  if (type.kind === 'NamedType') {
    const definition = decoder.schema.getType(type.name.value)
    return (definition as GraphQLObjectType).getFields
      ? decodeVector(decoder, definition as GraphQLObjectType, data)
      : decoder.scalarHandlers[type.name.value].decode(data)
  } else return decodeList(decoder, type, data)
}

function decodeList<T>(
  decoder: Decoder,
  type: TypeNode,
  data: ByteIterator
): T {
  const list = decoder.dataDecoder.list()
  while (!data.atEnd()) list.accumulate(decodeValue(decoder, type, data))
  data.take()
  return list.commit()
}

function decodeVector<T>(
  decoder: Decoder,
  type: GraphQLObjectType,
  data: ByteIterator
): T {
  const vector = decoder.dataDecoder.vector()
  const fields = type.astNode?.fields
  if (fields)
    // FIXME should be invariant
    while (!data.atEnd()) {
      const field = fields[data.take()]
      const { addValue } = vector.accumulate(field.name.value)
      addValue(decodeValue(decoder, field.type, data))
    }
  data.take()
  return vector.commit()
}

export default Decoder
