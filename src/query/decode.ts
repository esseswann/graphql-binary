import {
  buildSchema,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType
} from 'graphql'
import fs from 'fs'
import {
  DocumentNode,
  OperationTypeNode,
  TypeNode,
  VariableDefinitionNode
} from 'graphql/language/ast'
import util from 'util'

import { ByteIterator, createIterator } from '../iterator'
import { documentDecoder, variablesHandler } from './documentDecoder'
import {
  ASCII_OFFSET,
  AccumulateVariables,
  Decoder,
  DecodeResult,
  END,
  MIN_LENGTH,
  Operation
} from './index.d'
import jsonDecoder from './jsonDecoder'

function decode(schema: GraphQLSchema, data: Uint8Array): DecodeResult {
  if (data.length < MIN_LENGTH)
    throw new Error(`Data packet is less than ${MIN_LENGTH} bytes`)

  const byteIterator = createIterator<number>(data, END)

  const operation = Operation[byteIterator.take()] as OperationTypeNode

  const variables = variablesHandler()

  const selectionSet = decodeQuery(
    documentDecoder, // FIXME add context
    schema.getType('Query') as GraphQLObjectType,
    byteIterator,
    variables.accumulate
  )

  const variableDefinitions = variables.commit()

  const dataDecoder = new DataDecoder(
    schema,
    jsonDecoder,
    byteIterator,
    scalarHandlers
  )

  const document: DocumentNode = {
    kind: 'Document',
    definitions: [
      {
        kind: 'OperationDefinition',
        operation: operation,
        selectionSet: selectionSet,
        ...(variableDefinitions && { variableDefinitions })
      }
    ]
  }

  return {
    document,
    variables: dataDecoder.decode(variableDefinitions)
  }
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

class DataDecoder<Vector, List> {
  schema: GraphQLSchema
  decoder: Decoder<Vector, List>
  data: ByteIterator<number>
  scalarHandlers: ScalarHandlers

  constructor(
    schema: GraphQLSchema,
    decoder: Decoder<Vector, List>,
    data: ByteIterator<number>,
    scalarHandlers: ScalarHandlers
  ) {
    this.schema = schema
    this.decoder = decoder
    this.data = data
    this.scalarHandlers = scalarHandlers
  }

  decode(dictionary: Array<VariableDefinitionNode>) {
    const vector = this.decoder.vector()
    for (let index = 0; index < dictionary.length; index++) {
      const { type, variable } = dictionary[index]
      const { addValue } = vector.accumulate(variable.name.value)
      addValue(this.value(type))
    }
    return vector.commit()
  }

  list(type: TypeNode) {
    const list = this.decoder.list()
    while (!this.data.atEnd()) list.accumulate(this.value(type))
    this.data.take()
    return list.commit()
  }

  value(type: TypeNode) {
    if (type.kind === 'NonNullType') type = type.type
    if (type.kind === 'NamedType') {
      const definition = this.schema.getType(type.name.value)
      return (definition as GraphQLObjectType).getFields
        ? this.vector(definition as GraphQLObjectType)
        : this.scalarHandlers[type.name.value].decode(this.data)
    } else this.list(type)
  }

  vector(type: GraphQLObjectType) {
    const vector = this.decoder.vector()
    const fields = type.astNode.fields
    while (!this.data.atEnd()) {
      const field = fields[this.data.take()]
      const { addValue } = vector.accumulate(field.name.value)
      addValue(this.value(field.type))
    }
    this.data.take()
    return vector.commit()
  }
}

function decodeQuery<Vector>(
  decoder: Decoder<Vector, any>,
  definition: GraphQLObjectType,
  data: ByteIterator<number>,
  variablesHandler: AccumulateVariables,
  currentVariable: number = ASCII_OFFSET
) {
  const { accumulate, commit } = decoder.vector()

  const fieldsArray = definition.astNode.fields
  const fieldsMap = definition.getFields()

  while (!data.atEnd()) {
    const index = data.take()
    const field = fieldsArray[index]
    const callbacks = accumulate(field.name.value)
    const type = fieldsMap[field.name.value].type as GraphQLObjectType

    if (field.arguments.length > 0) {
      while (!data.atEnd()) {
        const arg = field.arguments[data.current() - index - 1]
        // FIXME check if actually an argument
        if (arg) {
          const variableName = String.fromCharCode(currentVariable)
          callbacks.addArg(arg.name.value, variableName)
          data.take()
          currentVariable += 1
          // FIXME this direct callback with type definition breaks abstraction gap
          variablesHandler(variableName, arg.type)
        } else break
      }
    }

    if (type.getFields)
      callbacks.addValue(
        decodeQuery(decoder, type, data, variablesHandler, currentVariable)
      )

    callbacks.commit()
  }

  data.take()

  return commit()
}

type ScalarHandlers = {
  [key: string]: ScalarHandler<any>
}

interface ScalarHandler<T> {
  encode: (data: T) => Uint8Array
  decode: (data: ByteIterator<number>) => T
}

const query = new Uint8Array([
  Operation.query,
  // 4,
  // 0,
  // 1,
  // 0,
  // END,
  // END,
  7,
  8,
  13,
  END,
  // Variables start here
  15,
  0,
  1,
  0,
  END
])

const schema = fs.readFileSync('./src/fixtures/schema.graphql', 'utf-8')

const builtSchema = buildSchema(schema)
const decodedQuery = decode(builtSchema, query)
console.log(util.inspect(decodedQuery, { showHidden: false, depth: null }))
