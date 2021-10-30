import { GraphQLEnumType, GraphQLObjectType, GraphQLSchema, Kind } from 'graphql'
import {
  DocumentNode,
  NameNode,
  OperationTypeNode,
  TypeNode,
  VariableDefinitionNode
} from 'graphql/language/ast'
import dissoc from 'lodash/fp/dissoc'
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
  DataDecoder,
  Flags
} from './types'
import jsonDecoder from './jsonDecoder'
import extractTargetType from './extractTargetType'

class Decoder {
  readonly schema: GraphQLSchema
  readonly queryDecoder: QueryDecoder<any, any>
  readonly dataDecoder: DataDecoder<any, any, any>
  readonly scalarHandlers: ScalarHandlers
  readonly topLevelTypes = { // FIXME
    query: 'getQueryType',
    mutation: 'getMutationType',
    subscription: 'getSubscriptionType'
  }

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.queryDecoder = documentDecoder
    this.dataDecoder = jsonDecoder
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
  }

  decode(data: Uint8Array): DecodeResult {
    const iterator = createIterator(data, END)

    const configBitmask = iterator.take()
    // FIXME this should be done more elegantly
    const operation = (
      // Order is important
      (configBitmask & Operation.mutation) === Operation.mutation
        ? 'mutation'
        : (configBitmask & Operation.subscription) === Operation.subscription
        ? 'subscription'
        : (configBitmask & Operation.query) === Operation.query
        ? 'query'
        : null
    ) as OperationTypeNode
    const name =
      (configBitmask & Flags.Name) === Flags.Name
        ? ({
            kind: 'Name',
            value: this.scalarHandlers.String.decode(iterator)
          } as NameNode)
        : undefined

    const { selectionSet, variableDefinitions } = decodeQuery(
      this,
      this.schema[this.topLevelTypes[operation]]() as GraphQLObjectType,
      iterator,
      this.queryDecoder.variables()
    )

    const hasVariables = variableDefinitions.length

    const document: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          name,
          kind: Kind.OPERATION_DEFINITION,
          operation: operation,
          selectionSet: selectionSet,
          ...(hasVariables && { variableDefinitions })
        }
      ]
    }

    return {
      document,
      variables: hasVariables
        ? decodeVariables(this, variableDefinitions, iterator)
        : null
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
            variablesHandler.accumulate(variableName, cleanLocations(arg.type))
          } else break
        }

      const typeName = extractTargetType(field.type)
      const fieldType = decoder.schema.getType(typeName)
      // console.log(typeName, (fieldType as GraphQLObjectType).astNode)
      if ((fieldType as GraphQLObjectType).getFields) {
        const children = decodeQuery(
          decoder,
          fieldType as GraphQLObjectType,
          data,
          variablesHandler
        )
        // FIXME abstraction should work without selectionSet subkey
        callbacks.addValue(children.selectionSet)
      }
      callbacks.commit()
    }
  data.take()
  return {
    selectionSet: vector.commit(),
    variableDefinitions: variablesHandler.commit()
  }
}

// FIXME this is wrong
function cleanLocations(object: TypeNode): TypeNode {
  return dissoc('loc', dissoc('name.loc', object))
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
  if (type.kind === Kind.NON_NULL_TYPE) type = type.type
  if (type.kind === Kind.NAMED_TYPE) {
    const definition = decoder.schema.getType(type.name.value)
    return (definition as GraphQLObjectType).getFields
      ? decodeVector(decoder, definition as GraphQLObjectType, data)
      : (definition as GraphQLEnumType).getValues
        ? (definition as GraphQLEnumType).getValues()[data.take()].value
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
