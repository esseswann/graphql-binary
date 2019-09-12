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
    yello(arg1: Int arg2: String): String
    hellos: [Entity]
    yellos(arg2: YellosArgs arg3: String): [String]
  }
`)

const query = `
{
  hello { id }
  hellos { id }
  yello(arg1: 1 arg2: "test")
  yellos
}`

const parsedQuery = parse(query)
const schemaQueryFields = schema.getQueryType().getFields()

const newMap = generateDictionaries(schemaQueryFields)
// arg = parsedQuery.definitions[0].selectionSet.selections[3].arguments[0]
const encoded = encode(parsedQuery.definitions[0], newMap.encode)
const decoded = decode(encoded, newMap.decode)
console.log(encoded, decoded)