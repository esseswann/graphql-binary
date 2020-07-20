import { makeExecutableSchema, addMocksToSchema } from 'graphql-tools'
import { graphql, buildSchema } from 'graphql'
import { print } from 'graphql/language/printer'

import encodeResponse from './encode'
import decodeResponse from './decode'
import generateDictionary from 'dictionary'
import query from 'fixtures/basicQuery.graphql'
import schema from 'fixtures/schema.graphql'

const executableSchema = makeExecutableSchema({ typeDefs: schema })
addMocksToSchema({ schema: executableSchema })

test('decoded response matches encoded', () =>
  Promise.all([
    graphql(executableSchema, print(query)),
    generateDictionary(buildSchema(schema))
  ])
    .then(([{ data }, dictionary]) =>
      expect(decodeResponse(query, dictionary, encodeResponse(query, dictionary, data)))
        .toEqual(data)))

test('encoded response is at least 30% smaller', () =>
  Promise.all([
    graphql(executableSchema, print(query)),
    generateDictionary(buildSchema(schema))
  ])
    .then(([{ data }, dictionary]) =>
      expect(encodeResponse(query, dictionary, data).length / JSON.stringify(data).length)
        .toBeLessThan(0.665)))