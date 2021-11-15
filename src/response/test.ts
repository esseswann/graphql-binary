import { addMocksToSchema } from '@graphql-tools/mock'
import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { buildSchema, graphql, print } from 'graphql'
import { BasicDocument } from '../fixtures'
import Decoder from '../query/decode'
import Encoder from '../query/encode'
import decode from './decode'
import encode from './encode'

const schemaString = fs.readFileSync('src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaString)

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)

const executableSchema = makeExecutableSchema({ typeDefs: schema })
const schemaWithMocks = addMocksToSchema({
  schema: executableSchema,
  mocks: {
    Int: () => Math.floor(1000 * Math.random()), // FIXME prevent negative integers for now
    Float: () => 3.5 // FIXME should do something with precision being lost on decodes
  }
})

test('decoded response matches encoded', async () => {
  const response = await graphql({
    schema: schemaWithMocks,
    source: print(BasicDocument)
  })
  const encodedResponse = encode(decoder, BasicDocument, response.data)
  const decodedResponse = decode(encoder, BasicDocument, encodedResponse)
  expect(decodedResponse).toEqual(response.data)
})

// test('extendable types are applied', () =>
//   generateDictionary(buildSchema(extendableTypesSchema), extendableTypes.definitions)
//     .then(dictionary =>
//         expect(decodeResponse(extendableTypesQuery, dictionary, encodeResponse(extendableTypesQuery, dictionary, extendableTypes.data)))
//           .toEqual(extendableTypes.data)))
