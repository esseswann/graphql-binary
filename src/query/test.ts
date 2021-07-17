import fs from 'fs'
import { buildSchema, parse } from 'graphql'
import compress from 'graphql-query-compress'
import { print } from 'graphql/language/printer'

import generateDictionary from '../dictionary'
import Encoder from './encode'
import Decoder from './decode'

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

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)
const encodeResult = encoder.encode(query) as Uint8Array
const test = decoder.decode(encodeResult)
console.log(test)
// test('decoded query matches encoded', () =>
//   expect(decoder.decode(encoder.encode(query) as Uint8Array)).toEqual(query))
