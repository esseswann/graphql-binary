import { makeExecutableSchema, addMocksToSchema } from 'graphql-tools'
import { graphql, buildSchema } from 'graphql'
import { print } from 'graphql/language/printer'

import encodeResponse from './encode'
import decodeResponse from './decode'
import generateDictionary from 'dictionary'
import query from 'fixtures/basicQuery.graphql'
import schema from 'fixtures/schema.graphql'
import extendableTypesSchema from 'fixtures/extendableTypes/schema.graphql'
import extendableTypesQuery from 'fixtures/extendableTypes/query.graphql'
import * as extendableTypes from 'fixtures/extendableTypes/types'

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

test('extendable types are applied', () =>
  generateDictionary(buildSchema(extendableTypesSchema), extendableTypes.definitions)
    .then(dictionary =>
        expect(decodeResponse(extendableTypesQuery, dictionary, encodeResponse(extendableTypesQuery, dictionary, extendableTypes.data)))
          .toEqual(extendableTypes.data)))