import {
  DocumentNode,
  EnumTypeDefinitionNode,
  FieldNode,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  ListTypeNode,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNode,
  VariableDefinitionNode
} from 'graphql'
import {
  // VariablesEncoder,
  EncodedQueryWithHandler,
  EncodeResult,
  END,
  Flags,
  Operation
} from './types'
import defaultScalarHandlers, { ScalarHandlers } from '../scalarHandlers'
import extractTargetType from './extractTargetType'
import mergeArrays from '../mergeArrays'

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
    const result: Array<number> = []
    const { definitions } = this.prepareDocument(query)
    const { operation, variableDefinitions, selectionSet } =
      definitions[0] as OperationDefinitionNode

    encodeQueryVector(
      this.schema,
      result,
      this.getOperationType(operation),
      selectionSet
    )
    // const variablesEncoder = new VariablesEncoder<Result, Variables>()

    let encodedVariables = new Uint8Array([])
    if (variableDefinitions) {
      let operationCode = Operation[operation]
      if (variableDefinitions) operationCode |= Flags.Variables
      result.unshift(operationCode)

      // FIXME should prepare the variables
      const preparedVariables = {
        A: 1,
        B: 2.5,
        C: true,
        D: 'test',
        E: 'THIRD',
        F: {
          inputMap: {
            int: 123,
            inputListScalar: [1, 2, 3, 4, 2],
            inputListMap: [
              {
                int: 123,
                inputListScalar: [1, 2, 3, 4]
              }
            ]
          }
        }
      }
      encodedVariables = encodeVariables(
        this,
        variableDefinitions,
        preparedVariables
      )
    }
    return {
      query: mergeArrays(new Uint8Array(result), encodedVariables),
      handleResponse: () => ({} as Result)
    }
    // variablesEncoder.encodeVariables
    // (variables: Variables) => ({
    // })
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
    result = mergeArrays(
      result,
      encodeValue(encoder, type, data[variable.name.value])
    )
  }

  return result
}

function encodeValue(encoder: Encoder, type: TypeNode, data: any): Uint8Array {
  let result = new Uint8Array([])

  if (type.kind === 'NonNullType') type = type.type
  if (type.kind === 'NamedType') {
    const definition = encoder.schema.getType(type.name.value)
    if (!definition) throw new Error(`Unknown type ${type.name.value}`)

    const kind = definition.astNode?.kind

    if (!kind && encoder.scalarHandlers[definition.name])
      result = encoder.scalarHandlers[definition.name].encode(data)
    else if (kind === 'ScalarTypeDefinition' && encoder.scalarHandlers[kind])
      result = encoder.scalarHandlers[kind].encode(data)
    else if (kind === 'EnumTypeDefinition') {
      const index = (
        definition.astNode as EnumTypeDefinitionNode
      ).values?.findIndex(({ name }) => name.value === data)
      if (index === -1 || index === undefined)
        throw new Error(`Unknown Enum value ${data} for ${type.name.value}`)
      result = new Uint8Array([index])
    } else if (kind === 'InputObjectTypeDefinition') {
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

// class VariablesEncoder<Result, Variables> {
//   schema: GraphQLSchema
//   encodedQuery: Uint8Array
//   variablesBits: Array<Uint8Array>
//   variablesMap: Map<string, VariableConfig>

//   encodeVariables(data: Variables): EncodedQueryWithHandler<Result> {
//     const variableBits = [...this.variablesBits]
//     for (const property in data) {
//       // FIXME there are cases when people really want to use null
//       if (data[property] != null) {
//         const { typeName, index } = this.variablesMap.get(property)
//         // variableBits.splice(index, 0, this.encodeValue(data[property]))
//       }
//     }
//     return {
//       query: mergeArrays(this.encodedQuery, ...variableBits),
//       handleResponse: () => ({} as Result)
//     }
//   }

//   encodeValue(type: GraphQLType, data: any): Uint8Array {
//     if (data.hasOwnProperty('length')) console.log(data)
//     return new Uint8Array([])
//   }
// }

// type VariableConfig = {
//   typeName: string
//   index: number
// }

export default Encoder
