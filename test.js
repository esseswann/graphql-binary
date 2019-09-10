import { buildSchema, parse } from 'graphql'
import { encode, decode, generateDictionaries } from './index'

const schema = buildSchema(`
  type YellosArgs {
    test: String
  }
  type Entity {
    id: Int
    name: String
  }
  type Query {
    hello: Entity,
    yello(arg1: Int): String
    hellos: [Entity]
    yellos(arg2: YellosArgs arg3: String): [String]
  }
`)

const query = `
{
  hello { id }
  hellos { id }
  yello(arg1: 1)
  yellos
}`

const parsedQuery = parse(query)
const schemaQueryFields = schema.getQueryType().getFields()

const newMap = generateDictionaries(schemaQueryFields)
const encoded = encode(parsedQuery.definitions[0], newMap.encode)
const decoded = decode(encoded, newMap.decode)
console.log(encoded, decoded)