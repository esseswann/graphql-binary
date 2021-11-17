import { addMocksToSchema } from '@graphql-tools/mock'
import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { buildSchema, ExecutionResult, graphql, print } from 'graphql'
import { Decoder, Encoder } from '.'
import {
  BasicDocument,
  BasicQuery,
  WithVariablesDocument,
  WithVariablesQuery,
  WithVariablesQueryVariables
} from './fixtures'
import customScalarHandlers from './fixtures/customScalarHandlers'
import withVariablesVariables from './fixtures/queryWithVariablesVariables'
import { EncodedQueryWithHandler, VariablesEncoder } from './query/types'

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

test('variables query full pass', async () => {
  const handleVariables = encoder.encode<
    WithVariablesQuery,
    WithVariablesQueryVariables
  >(WithVariablesDocument) as VariablesEncoder<
    WithVariablesQuery,
    WithVariablesQueryVariables
  >
  const encoded = handleVariables(withVariablesVariables)
  const decoded = decoder.decode(encoded.query)
  expect(decoded.document).toEqual(WithVariablesDocument)
  expect(decoded.variables).toEqual(withVariablesVariables)

  const response: ExecutionResult<WithVariablesQuery> = await graphql({
    schema: schemaWithMocks,
    source: print(WithVariablesDocument)
  })
  const encodedResponse = decoded.encodeResponse(response.data)
  const decodedResponse = encoded.decodeResponse(encodedResponse)
  expect(decodedResponse).toEqual(response.data)
})

test('basic query full pass', async () => {
  const encoded = encoder.encode<BasicQuery>(
    BasicDocument
  ) as EncodedQueryWithHandler<BasicQuery>
  const decoded = decoder.decode(encoded.query)
  expect(decoded.document).toEqual(BasicDocument)
  const response: ExecutionResult<BasicQuery> = await graphql({
    schema: schemaWithMocks,
    source: print(BasicDocument)
  })
  const encodedResponse = decoded.encodeResponse(response.data)
  const decodedResponse = encoded.decodeResponse(encodedResponse)
  expect(decodedResponse).toEqual(response.data)
})
