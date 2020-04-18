import { makeExecutableSchema, addMocksToSchema } from 'graphql-tools'
import { graphql, buildSchema } from 'graphql'
import { print } from 'graphql/language/printer'
import get from 'lodash/fp/get'

import encodeResponse from './encode'
import decodeResponse from './decode'
import query from 'fixtures/basicQuery.graphql'
import schema from 'fixtures/schema.graphql'

const executableSchema = makeExecutableSchema({ typeDefs: schema })
addMocksToSchema({ schema: executableSchema })

test('decoded response matches encoded ', () =>
  graphql(executableSchema, print(query))
    .then(get('data'))
    .then(response =>
      expect(decodeResponse(query, encodeResponse(query, response)))
        .toEqual(response)))