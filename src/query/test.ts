import fs from 'fs'
import { buildSchema } from 'graphql'
import {
  Enumerable,
  WithVariablesDocument,
  WithVariablesQuery,
  WithVariablesQueryVariables
} from '../fixtures'
import Decoder from './decode'
// import compress from 'graphql-query-compress'
// import { print } from 'graphql/language/printer'
// import generateDictionary from '../dictionary'
import Encoder from './encode'
import { VariablesEncoder } from './types'
// import { EncodedQueryWithHandler, VariablesEncoder } from './types'

const schemaString = fs.readFileSync('src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaString)

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)
// const encodedBasicQuery = encoder.encode<BasicQueryResult>(
//   basicQuery
// ) as EncodedQueryWithHandler<BasicQueryResult>
// if (encodedBasicQuery.query) {
//   console.log(decoder.decode(encodedBasicQuery.query))
// }

const preparedVariables = {
  A: 1,
  B: 2.5,
  C: true,
  D: 'test',
  E: Enumerable.First,
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

const handleVariables = encoder.encode<
  WithVariablesQuery,
  WithVariablesQueryVariables
>(WithVariablesDocument) as VariablesEncoder<
  WithVariablesQuery,
  WithVariablesQueryVariables
>
handleVariables(preparedVariables)
// console.log(encodedBasicQueryWithArgs.query)
// const test = decoder.decode(encoded.query)
console.log(handleVariables(preparedVariables).query)
test('decoded query matches encoded', () =>
  expect(
    decoder.decode(handleVariables(preparedVariables).query).document
  ).toEqual(WithVariablesDocument))
