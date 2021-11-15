import fs from 'fs'
import { buildSchema } from 'graphql'
import {
  BasicDocument, BasicQuery
} from '../fixtures'
import Decoder from '../query/decode'
import Encoder from '../query/encode'
import decode from './decode'
import encode from './encode'

const schemaString = fs.readFileSync('src/fixtures/schema.graphql', 'utf8')
const schema = buildSchema(schemaString)

const decoder = new Decoder(schema)
const encoder = new Encoder(schema)

const data: BasicQuery = {
  int: 10,
  float: 5.5,
  boolean: true,
  string: 'string',
  withArgs: 'withArgs',
  scalarArray: ['scalar'],
  mapArray: [{ 
    id: 'id',
    map: {
      id: 'id',
      map: {
        id: 'id'
      }
    }
  }],
  map: {
    id: 'id',
    map: {
      id: 'id',
      map: {
        id: 'id'
      }
    }
  }
}

test('decoded response matches encoded', () => {
  const encodedResponse = encode(decoder, BasicDocument, data)
  const decodedResponse = decode(encoder, BasicDocument, encodedResponse)
  expect(decodedResponse).toEqual(data)
})