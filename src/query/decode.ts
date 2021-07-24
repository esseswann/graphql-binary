import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import {
  DocumentNode,
  FieldDefinitionNode,
  OperationTypeNode,
  SelectionSetNode,
  TypeNode
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
  DataDecoder,
  QueryKeyHandler
} from './index.d'
import jsonDecoder from './jsonDecoder'
import extractTargetType from './extractTargetType'

class Decoder {
  private readonly schema: GraphQLSchema
  private readonly queryDecoder: QueryDecoder<any, any>
  private readonly dataDecoder: DataDecoder<any, any, any>
  private readonly scalarHandlers: ScalarHandlers

  private data: ByteIterator<number>
  private currentVariableIndex: number
  private variablesHandler: VariablesHandler<any>

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.queryDecoder = documentDecoder
    this.dataDecoder = jsonDecoder
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
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
      ...(hasVariables && { variables: this.decodeVariables() })
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

      const typeName = extractTargetType(field.type)
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
    addArg: QueryKeyHandler<any>['addArg']
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
    if (this.data.current() === undefined)
      throw new Error('Expected variables data for this query')
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

export default Decoder
