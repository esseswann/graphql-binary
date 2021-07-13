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

// function decodeVariables<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   schema: GraphQLSchema,
//   dictionary: Array<VariableDefinitionNode>,
//   scalarHandlers: ScalarHandlers,
//   data: ByteIterator<number>
// ) {
//   const vector = decoder.vector()
//   for (let index = 0; index < dictionary.length; index++) {
//     const { type, variable } = dictionary[index]
//     const { addValue } = vector.accumulate(variable.name.value)
//     addValue(decodeValue(decoder, schema, type, scalarHandlers, data))
//     // console.log(type)
//     // const scalarHandler = scalarHandlers[type.name.value]
//     // const value = scalarHandlers[type.name.value].decode(data)
//     // addValue(value)
//   }
//   return vector.commit()
// }

// function decodeValue<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   schema: GraphQLSchema,
//   typeNode: TypeNode,
//   scalarHandlers: ScalarHandlers,
//   data: ByteIterator<number>
// ): any {
//   const type = schema.getType(typeNode.name.value)
//   if ((type as GraphQLObjectType).getFields)
//     return decodeVector(decoder, type as GraphQLObjectType, data)
//   // console.log('vector')
//   // Important to check if LIST first
//   // if (has(dictionary.config, Config.LIST))
//   //   return decodeList(decoder, dictionary as DictionaryListEntry, data)
//   // if (has(dictionary.config, Config.VECTOR))
//   //   return decodeVector(decoder, dictionary as DictionaryVector, data)
//   // if (has(dictionary.config, Config.SCALAR))
//   //   return (dictionary as DictionaryScalar<any>).handler.decode(data)
// }

// function decodeVector<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   definition: GraphQLObjectType,
//   data: ByteIterator<number>
// ) {
//   const { accumulate, commit } = decoder.vector()
//   const fieldsArray = definition.astNode.fields
//   const fieldsMap = definition.getFields()

//   while (!data.atEnd()) {
//     const index = data.take()
//     const field = fieldsArray[index]
//     const callbacks = accumulate(field.name.value)
//     const type = fieldsMap[field.name.value].type as GraphQLObjectType
//     callbacks.addValue(decodeValue())
//   }

//   return commit()
// }

// function decodeVector<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   dictionary: Array<VariableDefinitionNode>,
//   data: ByteIterator<number>
// ) {
//   const vector = decoder.vector()
//   console.log(dictionary)

//   while (!data.atEnd()) {
//     const field = dictionary
//   const field: DictionaryEntry = dictionary.fields[data.take()]
//   const { addValue } = vector.accumulate(field.name)
//   addValue(decodeValue(decoder, field, data))
//   }

//   return vector.commit()
// }

// function decodeList<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   dictionary: Array<VariableDefinitionNode>,
//   data: ByteIterator<number>
// ) {
//   const list = decoder.list()

// while (!data.atEnd())
//   if (has(dictionary.config, Config.VECTOR))
//     list.accumulate(
//       decodeValue(decoder, (dictionary as DictionaryListVector).ofType, data)
//     )
//   else
//     list.accumulate(
//       (dictionary as DictionaryListScalar<any>).handler.decode(data)
//     )

// data.take()

//   return list.commit()
// }

// const scalar: DictionaryScalar<string> = {
//   name: 'scalarList',
//   config: Config.LIST | Config.SCALAR,
//   typeName: 'String',
//   handler: {
//     encode: (data: string) => new Uint8Array(new TextEncoder().encode(data)),
//     decode: (data: ByteIterator<number>) => String.fromCharCode(data.take())
//   }
// }

// const vector: DictionaryVector = {
//   name: 'vector',
//   typeName: 'MyVector',
//   config: Config.VECTOR,
//   fields: [scalar]
// }

// vector.fields.push(vector)

// const dataDictionary: DictionaryVector = {
//   name: 'Arg',
//   typeName: 'ArgVector',
//   config: Config.VECTOR,
//   fields: [
//     scalar,
//     {
//       name: 'vectorList',
//       config: Config.LIST | Config.VECTOR,
//       ofType: vector,
//       listConfig: [true, false],
//       fields: []
//     } as DictionaryListVector
//   ]
// }

// const string: ScalarDefinition<string> = {
//   name: 'String',
//   encode: (data: string) => new Uint8Array([]),
//   decode: (data: ByteIterator<number>) => 'test'
// }

// const scalar: Field = {
//   name: 'scalar',
//   config: Config.SCALAR | Config.HAS_ARGUMENTS,
//   type: string
// }

// const arg: Field = {
//   name: 'arg',
//   config: Config.SCALAR | Config.ARGUMENT,
//   type: string
// }

// const queryDictionary: VectorDefinition = {
//   name: 'Query',
//   fields: [scalar, arg, arg]
// }
// {
//   name: 'query',
//   typeName: 'Query',
//   config: Config.VECTOR,
//   fields: [
//     {
//       name: `scalar`,
//       config: Config.SCALAR | Config.HAS_ARGUMENTS,
//       typeName: 'String',
//       handler: {
//         encode: () => new Uint8Array(),
//         decode: () => 'rest'
//       }
//     },
//     {
//       name: `arg`,
//       config: Config.SCALAR | Config.ARGUMENT,
//       typeName: 'String',
//       handler: {
//         encode: () => new Uint8Array(),
//         decode: () => 'rest'
//       }
//     },
//     {
//       name: `arg2`,
//       config: Config.SCALAR | Config.ARGUMENT,
//       typeName: 'String',
//       handler: {
//         encode: () => new Uint8Array(),
//         decode: () => 'rest'
//       }
//     },
//     {
//       name: 'vector',
//       config: Config.VECTOR,
//       typeName: 'Plest',
//       fields: [
//         {
//           name: `scalar2`,
//           typeName: 'String',
//           config: Config.SCALAR,
//           handler: {
//             encode: () => new Uint8Array(),
//             decode: () => 'rest'
//           }
//         }
//       ]
//     }
//   ]
// }

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

// const decodedQuery = decode(queryDictionary, query)
// // console.log(util.inspect(decodedData, { showHidden: false, depth: null }))

const schema = fs.readFileSync('./src/fixtures/schema.graphql', 'utf-8')

const builtSchema = buildSchema(schema)
const decodedQuery = decode(builtSchema, query)
console.log(
  util.inspect(decodedQuery.variables, { showHidden: false, depth: null })
)
