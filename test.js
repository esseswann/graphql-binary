import { buildSchema, parse } from 'graphql'
import generate from './dictionary'
import { encode, decode } from './index'

const schema = buildSchema(`
  input YellosArgs {
    test: String
  }
  type Name {
    text: String
    url: String
  }
  type Entity {
    id: Int
    name: Name
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
  hellos { id name { text url } }
  yello(arg1: 1 arg2: "test")
  yellos
}`


const parsedQuery = parse(query)
const schemaQueryFields = schema.getQueryType().getFields()

generate(schema)
  .then(parsed => {
    const encoded = encode(parsedQuery, parsed)
    const decoded = decode(encoded, parsed)

    return decoded
  })
  .then(console.log)