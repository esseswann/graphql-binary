import fs from 'fs'
import { buildSchema, print } from 'graphql'
import compress from 'graphql-query-compress'
import {
  BasicDocument,
  BasicQuery,
  NoArgsDocument,
  NoArgsMutation,
  NoArgsSubscriptionDocument,
  NoArgsSubscriptionSubscription,
  WithVariablesDocument,
  WithVariablesQuery,
  WithVariablesQueryVariables
} from '../fixtures'
import withVariablesVariables from '../fixtures/queryWithVariablesVariables'
import Decoder from './decode'
import Encoder from './encode'
import { EncodedQueryWithHandler, VariablesEncoder } from './types'

const schemaString = fs.readFileSync('src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaString)

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)

test('decoded query matches encoded', () => {
  const result = encoder.encode<BasicQuery>(
    BasicDocument
  ) as EncodedQueryWithHandler<BasicQuery>
  expect(decoder.decode(result.query).document).toEqual(BasicDocument)
})

test('decoded variables query matches encoded', () => {
  const handleVariables = encoder.encode<
    WithVariablesQuery,
    WithVariablesQueryVariables
  >(WithVariablesDocument) as VariablesEncoder<
    WithVariablesQuery,
    WithVariablesQueryVariables
  >
  const result = handleVariables(withVariablesVariables)
  const decoded = decoder.decode(result.query)
  expect(decoded.document).toEqual(WithVariablesDocument)
  expect(decoded.variables).toEqual(withVariablesVariables)
})

test('decoded mutation matches encoded', () => {
  const result = encoder.encode<NoArgsMutation>(
    NoArgsDocument
  ) as EncodedQueryWithHandler<NoArgsMutation>
  expect(decoder.decode(result.query).document).toEqual(NoArgsDocument)
})

test('decoded subscription matches encoded', () => {
  const result = encoder.encode<NoArgsSubscriptionSubscription>(
    NoArgsSubscriptionDocument
  ) as EncodedQueryWithHandler<NoArgsSubscriptionSubscription>
  expect(decoder.decode(result.query).document).toEqual(
    NoArgsSubscriptionDocument
  )
})

test('binary representation at least twice smaller than string representation', () => {
  const encoded = encoder.encode<BasicQuery>(
    BasicDocument
  ) as EncodedQueryWithHandler<BasicQuery>
  const graphql = compress(print(BasicDocument))
  expect(graphql.length / encoded.query.length).toBeGreaterThanOrEqual(0.3)
})
