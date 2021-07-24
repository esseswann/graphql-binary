import fs from 'fs'
import { buildSchema, parse } from 'graphql'
// import compress from 'graphql-query-compress'
// import { print } from 'graphql/language/printer'

// import generateDictionary from '../dictionary'
import Encoder from './encode'
import Decoder from './decode'
import { EncodedQueryWithHandler, VariablesEncoder } from './types'

// import query from '../fixtures/basicQuery.graphql'
// import mutation from '../fixtures/mutation.graphql'
// import schema from '../fixtures/schema.graphql'
// import subscription from '../fixtures/subscription.graphql'
// import queryWithVariables from '../fixtures/variables/query.graphql'
// import variablesSchema from '../fixtures/variables/schema.graphql'

const queryFile = fs.readFileSync('./src/fixtures/basicQuery.graphql', 'utf8')
const schemaFile = fs.readFileSync('./src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaFile)
const query = parse(queryFile, { noLocation: true })

type BasicQueryResult = {
  int: number
  float: number
  boolean: boolean
  string: string
}

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)
const encodeResult = encoder.encode<BasicQueryResult>(
  query
) as EncodedQueryWithHandler<BasicQueryResult>
if (encodeResult.query) {
  console.log(decoder.decode(encodeResult.query))
}
// const test = decoder.decode()
// test('decoded query matches encoded', () =>
//   expect(decoder.decode(encoder.encode(query) as Uint8Array)).toEqual(query))
