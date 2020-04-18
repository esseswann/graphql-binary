import encode from './encode'
import decode from './decode'
import query from 'fixtures/basicQuery.graphql'
import compress from 'graphql-query-compress'
import { print } from 'graphql/language/printer'
import { buildSchema } from 'graphql'
import generateDictionary from 'dictionary'
import schema from 'fixtures/schema.graphql'

const generatedDictonary = generateDictionary(buildSchema(schema))

test('encodes without errors', () =>
  generatedDictonary
    .then(dictonary => 
      expect(encode(query, dictonary))
        .toBeInstanceOf(Uint8Array)))

test('decoded matches encoded', () =>
  generatedDictonary
    .then(dictionary =>
      expect(decode(encode(query, dictionary), dictionary)[0])
        .toEqual(query.definitions[0].selectionSet.selections)))

test('binary representation at least twice smaller than string representation', () =>
  generatedDictonary
    .then(dictionary =>
      expect(decode(encode(query, dictionary), dictionary)[0].length / compress(print(query)).length)
        .toBeLessThan(0.5)))