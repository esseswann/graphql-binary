import fs from 'fs'
import { buildSchema, parse } from 'graphql'
import compress from 'graphql-query-compress'
import { print } from 'graphql/language/printer'

import generateDictionary from '../dictionary'
import Encoder from './encode_old'
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

const decode = new Decoder(schema)
const encode = new Encoder(schema)

test('decoded query matches encoded', () =>
  expect(decode(encode(query))).toEqual(query))
