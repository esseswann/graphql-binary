import { buildSchema, GraphQLObjectType, GraphQLSchema } from 'graphql'
import {
  DocumentNode,
  OperationTypeNode,
  TypeNode,
  SelectionSetNode,
  FieldDefinitionNode,
  NamedTypeNode
} from 'graphql/language/ast'
import util from 'util'
import fs from 'fs'

import { ByteIterator, createIterator } from '../iterator'
import { documentDecoder } from './documentDecoder'
import {
  ASCII_OFFSET,
  Decoder,
  DecodeResult,
  END,
  Operation,
  KeyHandler,
  VariablesHandler,
  ScalarHandlers
} from './index.d'
import jsonDecoder from './jsonDecoder'

class MyDecoder {
  private readonly schema: GraphQLSchema
  private readonly queryDecoder: Decoder<any, any>
  private readonly dataDecoder: Decoder<any, any>
  private readonly scalarHandlers: ScalarHandlers

  private data: ByteIterator<number>
  private currentVariableIndex: number
  private variablesHandler: VariablesHandler<any>

  constructor(schema: GraphQLSchema) {
    this.schema = schema
    this.queryDecoder = documentDecoder
    this.dataDecoder = jsonDecoder
    this.scalarHandlers = scalarHandlers
  }

  decode(data: Uint8Array): DecodeResult {
    this.data = createIterator(data, END)
    this.currentVariableIndex = ASCII_OFFSET
    this.variablesHandler = this.queryDecoder.variables()

    const operation = Operation[this.data.take()] as OperationTypeNode

    const selectionSet: SelectionSetNode = this.decodeQuery(
      this.schema.getType('Query') as GraphQLObjectType
    )

    const variableDefinitions = this.variablesHandler.commit()

    const document: DocumentNode = {
      kind: 'Document',
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: operation,
          selectionSet: selectionSet,
          ...(variableDefinitions.length && { variableDefinitions })
        }
      ]
    }

    return {
      document,
      variables: this.decodeVariables()
    }
  }

  private decodeQuery(type: GraphQLObjectType) {
    const vector = this.queryDecoder.vector()
    const fields = type.astNode.fields
    while (!this.data.atEnd()) {
      const index = this.data.take()
      const field = fields[index]
      const callbacks = vector.accumulate(field.name.value)
      // CODE UNIQUE FOR QUERY
      if (field.arguments.length > 0)
        this.decodeArguments(field, index, callbacks.addArg)

      const typeName = (field.type as NamedTypeNode).name.value
      const fieldType = this.schema.getType(typeName) as GraphQLObjectType
      if (fieldType.getFields) callbacks.addValue(this.decodeQuery(fieldType))
      // CODE UNIQUE FOR QUERY
      callbacks.commit()
    }
    this.data.take()
    return vector.commit()
  }

  private decodeArguments(
    field: FieldDefinitionNode,
    index: number,
    addArg: KeyHandler<any>['addArg']
  ): void {
    while (!this.data.atEnd()) {
      const arg = field.arguments[this.data.current() - index - 1]
      if (arg) {
        const variableName = String.fromCharCode(this.currentVariableIndex)
        addArg(arg.name.value, variableName)
        this.data.take()
        this.currentVariableIndex += 1
        // FIXME this direct callback with type definition breaks abstraction gap
        this.variablesHandler.accumulate(variableName, arg.type)
      } else break
    }
  }

  private decodeVariables() {
    const dictionary = this.variablesHandler.commit()
    const vector = this.dataDecoder.vector()
    for (let index = 0; index < dictionary.length; index++) {
      const { type, variable } = dictionary[index]
      const { addValue } = vector.accumulate(variable.name.value)
      addValue(this.decodeValue(type))
    }
    return vector.commit()
  }

  private decodeValue(type: TypeNode) {
    if (type.kind === 'NonNullType') type = type.type
    if (type.kind === 'NamedType') {
      const definition = this.schema.getType(type.name.value)
      return (definition as GraphQLObjectType).getFields
        ? this.decodeVector(definition as GraphQLObjectType)
        : this.scalarHandlers[type.name.value].decode(this.data)
    } else this.decodeList(type)
  }

  private decodeVector(type: GraphQLObjectType) {
    const vector = this.dataDecoder.vector()
    const fields = type.astNode.fields
    while (!this.data.atEnd()) {
      const field = fields[this.data.take()]
      const { addValue } = vector.accumulate(field.name.value)
      addValue(this.decodeValue(field.type))
    }
    this.data.take()
    return vector.commit()
  }

  private decodeList(type: TypeNode) {
    const list = this.dataDecoder.list()
    while (!this.data.atEnd()) list.accumulate(this.decodeValue(type))
    this.data.take()
    return list.commit()
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

const query = new Uint8Array([
  Operation.query,
  4,
  0,
  1,
  0,
  END,
  END,
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
const decoder = new MyDecoder(builtSchema)
const decodedQuery = decoder.decode(query)
console.log(util.inspect(decodedQuery, { showHidden: false, depth: null }))
