import {
  DocumentNode,
  EnumTypeDefinitionNode,
  FieldNode,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  ListTypeNode,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNode,
  VariableDefinitionNode
} from 'graphql'
import mergeArrays from '../mergeArrays'
import defaultScalarHandlers, { ScalarHandlers } from '../scalarHandlers'
import extractTargetType from './extractTargetType'
import {
  // VariablesEncoder,
  // EncodedQueryWithHandler,
  EncodeResult,
  END,
  Flags,
  Operation
} from './types'

class Encoder {
  readonly schema: GraphQLSchema
  readonly scalarHandlers: ScalarHandlers

  constructor(schema: GraphQLSchema, customScalarHandlers?: ScalarHandlers) {
    this.schema = schema
    this.scalarHandlers = { ...defaultScalarHandlers, ...customScalarHandlers }
  }

  // FIXME not sure if making a default type argument value is a good idea
  encode<Result, Variables = void>(
    query: DocumentNode
  ): EncodeResult<Result, Variables> {
    let result: Array<number> = []
    const { definitions } = this.prepareDocument(query)
    const { operation, variableDefinitions, selectionSet, name } =
      definitions[0] as OperationDefinitionNode

    let configBitmask = Operation[operation]

    if (name.value) {
      configBitmask |= Flags.Name
      result = Array.from(this.scalarHandlers.String.encode(name.value))
    }

    encodeQueryVector(
      this.schema,
      result,
      this.getOperationType(operation),
      selectionSet
    )

    if (variableDefinitions) {
      configBitmask |= Flags.Variables
      result.unshift(configBitmask)

      return (variables: Variables) => ({
        query: mergeArrays(
          new Uint8Array(result),
          encodeVariables(this, variableDefinitions, variables)
        ),
        handleResponse: () => ({} as Result)
      })
    } else {
      result.unshift(configBitmask)

      return {
        query: new Uint8Array(result),
        handleResponse: () => ({} as Result)
      }
    }
  }

  private prepareDocument(query: DocumentNode) {
    return query
  }

  private getOperationType(operation: string): GraphQLObjectType {
    if (operation === 'query')
      return this.schema.getQueryType() as GraphQLObjectType
    else if (operation === 'mutation')
      return this.schema.getMutationType() as GraphQLObjectType
    else if (operation === 'subscription')
      return this.schema.getMutationType() as GraphQLObjectType
    else throw new Error(`Unsupported operation type ${operation}`)
  }
}

function encodeQueryVector(
  schema: GraphQLSchema,
  result: Array<number>,
  type: GraphQLObjectType,
  selectionSet: SelectionSetNode
): Array<number> {
  const fieldsArray = type.astNode?.fields || []
  for (let index = 0; index < selectionSet.selections.length; index++) {
    const selection = selectionSet.selections[index] as FieldNode
    const fieldIndex = fieldsArray.findIndex(
      ({ name }) => name.value === selection.name.value
    )
    result.push(fieldIndex)

    if (selection.arguments)
      for (let index = 0; index < selection.arguments.length; index++)
        result.push(fieldIndex + index + 1)

    if (selection.selectionSet) {
      const typeName = extractTargetType(fieldsArray[fieldIndex].type)
      const type = schema.getType(typeName) as GraphQLObjectType
      encodeQueryVector(schema, result, type, selection.selectionSet)
    }
  }
  result.push(END)
  return result
}

function encodeVariables(
  encoder: Encoder,
  variableDefinitions: Readonly<Array<VariableDefinitionNode>>,
  data: any
): Uint8Array {
  let result: Uint8Array = new Uint8Array()
  for (let index = 0; index < variableDefinitions.length; index++) {
    const { type, variable } = variableDefinitions[index]
    if (!data.hasOwnProperty(variable.name.value))
      throw new Error(`Variable ${variable.name.value} was not provided`)
    result = mergeArrays(
      result,
      encodeValue(encoder, type, data[variable.name.value])
    )
  }

  return result
}

function encodeValue(encoder: Encoder, type: TypeNode, data: any): Uint8Array {
  let result = new Uint8Array([])

  if (type.kind === Kind.NON_NULL_TYPE) type = type.type
  if (type.kind === Kind.NAMED_TYPE) {
    const definition = encoder.schema.getType(type.name.value)
    if (!definition) throw new Error(`Unknown type ${type.name.value}`)

    const kind = definition.astNode?.kind

    if (!kind && encoder.scalarHandlers[definition.name])
      result = encoder.scalarHandlers[definition.name].encode(data)
    else if (
      kind === Kind.SCALAR_TYPE_DEFINITION &&
      encoder.scalarHandlers[kind]
    )
      result = encoder.scalarHandlers[kind].encode(data)
    else if (kind === Kind.ENUM_TYPE_DEFINITION) {
      const index = (
        definition.astNode as EnumTypeDefinitionNode
      ).values?.findIndex(({ name }) => name.value === data)
      if (index === -1 || index === undefined)
        throw new Error(`Unknown Enum value ${data} for ${type.name.value}`)
      result = new Uint8Array([index])
    } else if (kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
      result = encodeVector(encoder, definition as GraphQLInputObjectType, data)
    } else
      throw new Error(
        `Unknown or non-input type ${type.name.value} in a variable`
      )
  } else result = encodeList(encoder, type, data)
  return result
}

function encodeVector(
  encoder: Encoder,
  type: GraphQLInputObjectType,
  data: {
    [key: string]: any
  }
): Uint8Array {
  let result = new Uint8Array()
  const fields = type.astNode?.fields
  if (fields)
    for (const key in data) {
      const index = fields.findIndex(({ name }) => name.value === key)
      if (index === -1)
        throw new Error(`No field with name ${key} found in ${type.name}`)
      const fieldType = fields[index]
      result = mergeArrays(
        result,
        new Uint8Array([index]),
        encodeValue(encoder, fieldType.type, data[key])
      )
    }
  result = mergeArrays(result, new Uint8Array([END]))
  return result
}

function encodeList(
  encoder: Encoder,
  type: ListTypeNode,
  data: Array<any>
): Uint8Array {
  let result = new Uint8Array([])
  for (let index = 0; index < data.length; index++)
    result = mergeArrays(result, encodeValue(encoder, type.type, data[index]))
  return mergeArrays(result, new Uint8Array([END]))
}

export default Encoder
