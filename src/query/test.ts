import fs from 'fs'
import { buildSchema } from 'graphql'
import {
  NoArgsMutation,
  BasicDocument,
  BasicQuery,
  Enumerable,
  WithVariablesDocument,
  WithVariablesQuery,
  WithVariablesQueryVariables,
  NoArgsDocument,
  NoArgsSubscriptionSubscription,
  NoArgsSubscriptionDocument
} from '../fixtures'
import Decoder from './decode'
import Encoder from './encode'
import { EncodedQueryWithHandler, EncodeResult, VariablesEncoder } from './types'

const schemaString = fs.readFileSync('src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaString)

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)

const preparedVariables: WithVariablesQueryVariables = {
  A: 1,
  B: 2.5,
  C: true,
  D: 'test',
  E: Enumerable.First,
  // F: {
  //   inputMap: {
  //     int: 123,
  //     inputListScalar: [1, 2, 3, 4, 2],
  //     inputListMap: [
  //       {
  //         int: 123,
  //         inputListScalar: [1, 2, 3, 4]
  //       }
  //     ]
  //   }
  // }
}

test('decoded query matches encoded', () => {
  const result = encoder.encode<BasicQuery>(BasicDocument) as EncodedQueryWithHandler<BasicQuery>
  expect(
    decoder.decode(result.query).document
  ).toEqual(BasicDocument)
})

test('decoded variables query matches encoded', () => {
  const handleVariables = encoder.encode<
    WithVariablesQuery,
    WithVariablesQueryVariables
  >(WithVariablesDocument) as
  VariablesEncoder<
    WithVariablesQuery,
    WithVariablesQueryVariables
  >
  expect(
    decoder.decode(handleVariables(preparedVariables).query).document
  ).toEqual(WithVariablesDocument)
})

test('decoded mutation matches encoded', () => {
  const result = encoder.encode<NoArgsMutation>(NoArgsDocument) as EncodedQueryWithHandler<NoArgsMutation>
  expect(
    decoder.decode(result.query).document
  ).toEqual(NoArgsDocument)
})

test('decoded subscription matches encoded', () => {
  const result = encoder.encode<NoArgsSubscriptionSubscription>(NoArgsSubscriptionDocument) as EncodedQueryWithHandler<NoArgsSubscriptionSubscription>
  expect(
    decoder.decode(result.query).document
  ).toEqual(NoArgsSubscriptionDocument)
})
