import { addMocksToSchema } from '@graphql-tools/mock'
import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { buildSchema, graphql, print } from 'graphql'
import { BasicDocument, CustomScalarQueryDocument } from '../fixtures'
import customScalarHandlers from '../fixtures/customScalarHandlers'
import Decoder from '../query/decode'
import Encoder from '../query/encode'
import decode from './decode'
import encode from './encode'

const schemaString = fs.readFileSync('src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaString)

const decoder = new Decoder(schema, customScalarHandlers)
const encoder = new Encoder(schema, customScalarHandlers)

const executableSchema = makeExecutableSchema({ typeDefs: schema })
const schemaWithMocks = addMocksToSchema({
  schema: executableSchema,
  mocks: {
    Float: () => 3.5 // FIXME should do something with precision being lost during decoding
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

test('extendable types are applied', () => {
  const data = {
    // Note that we set seconds to zero or tests will fail because we loose precision
    date: new Date('December 17, 1995 03:24:00')
  }
  const encodedResponse = encode(decoder, CustomScalarQueryDocument, data)
  const decodedResponse = decode(
    encoder,
    CustomScalarQueryDocument,
    encodedResponse
  )
  expect(decodedResponse).toEqual(data)
})
