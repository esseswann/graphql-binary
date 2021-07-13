import { buildSchema, GraphQLObjectType, GraphQLSchema } from 'graphql'
import fs from 'fs'
import { DocumentNode, OperationTypeNode } from 'graphql/language/ast'
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

  // Move to data
  byteIterator.take()

  return {
    document
    // variables: decodeValue(jsonDecoder, dataDictionary, byteIterator) // FIXME generate dataDictionary
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
        if (arg) {
          callbacks.addArg(arg.name.value, String.fromCharCode(currentVariable))
          data.take()
          currentVariable += 1
          console.log(arg)
          variablesHandler(arg.name.value, arg.type.name.value, true, [true])()
        } else break
      }
    }

    if (type.getFields)
      callbacks.addValue(
        decodeQuery(decoder, type, data, variablesHandler, currentVariable)
      )

    callbacks.commit()
  }

  return commit()
}

// function decodeValue<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   dictionary: DictionaryEntry,
//   data: ByteIterator<number>
// ): any {
//   // Important to check if LIST first
//   if (has(dictionary.config, Config.LIST))
//     return decodeList(decoder, dictionary as DictionaryListEntry, data)

//   if (has(dictionary.config, Config.VECTOR))
//     return decodeVector(decoder, dictionary as DictionaryVector, data)

//   if (has(dictionary.config, Config.SCALAR))
//     return (dictionary as DictionaryScalar<any>).handler.decode(data)
// }

// function decodeVector<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   dictionary: DictionaryVector,
//   data: ByteIterator<number>
// ) {
//   const vector = decoder.vector()

//   while (!data.atEnd()) {
//     const field: DictionaryEntry = dictionary.fields[data.take()]
//     const { addValue } = vector.accumulate(field.name)
//     addValue(decodeValue(decoder, field, data))
//   }

//   return vector.commit()
// }

// function decodeList<Vector, List>(
//   decoder: Decoder<Vector, List>,
//   dictionary: DictionaryListEntry,
//   data: ByteIterator<number>
// ) {
//   const list = decoder.list()

//   while (!data.atEnd())
//     if (has(dictionary.config, Config.VECTOR))
//       list.accumulate(
//         decodeValue(decoder, (dictionary as DictionaryListVector).ofType, data)
//       )
//     else
//       list.accumulate(
//         (dictionary as DictionaryListScalar<any>).handler.decode(data)
//       )

//   data.take()

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
  7,
  8,
  10,
  0,
  1,
  2,
  3,
  4,
  0,
  1,
  0,
  END,
  END
  // 0,
  // 1,
  // 2,
  // 3,
  // 0,
  // END,
  // // Variables start here
  // 0,
  // 1,
  // 2,
  // 3,
  // 4,
  // END,
  // 1,
  // 0,
  // 1,
  // END,
  // 1,
  // 0,
  // 1,
  // END
])

// const decodedQuery = decode(queryDictionary, query)
// // console.log(util.inspect(decodedData, { showHidden: false, depth: null }))

const schema = fs.readFileSync('./src/fixtures/schema.graphql', 'utf-8')

const builtSchema = buildSchema(schema)
const decodedQuery = decode(builtSchema, query)
console.log(util.inspect(decodedQuery, { showHidden: false, depth: null }))
