import { buildSchema } from 'graphql'
import compress from 'graphql-query-compress'
import { print } from 'graphql/language/printer'

import generateDictionary from 'dictionary'
import query from 'fixtures/basicQuery.graphql'
import mutation from 'fixtures/mutation.graphql'
import schema from 'fixtures/schema.graphql'
import subscription from 'fixtures/subscription.graphql'

import decode from './decode'
import encode from './encode'

delete query.loc // We do not store the source data
delete mutation.loc // We do not store the source data
delete subscription.loc // We do not store the source data

const generatedDictonary = generateDictionary(buildSchema(schema))

test('encodes without errors', () =>
  generatedDictonary
    .then(dictonary => 
      expect(encode(query, dictonary))
        .toBeInstanceOf(Uint8Array)))

test('decoded query matches encoded', () =>
  generatedDictonary
    .then(dictionary =>
      expect(decode(encode(query, dictionary), dictionary))
        .toEqual(query)))

test('mutation type is encoded', () =>
  generatedDictonary
    .then(dictionary => 
      expect(decode(encode(mutation, dictionary), dictionary))
        .toEqual(mutation)))

test('subscription type is encoded', () =>
  generatedDictonary
    .then(dictionary => 
      expect(decode(encode(subscription, dictionary), dictionary))
        .toEqual(subscription)))

test('binary representation at least twice smaller than string representation', () =>
  generatedDictonary
    .then(dictionary =>
      expect(encode(query, dictionary).length / compress(print(query)).length)
        .toBeLessThan(0.5)))