import { buildSchema, parse, print } from 'graphql'
import generate from './dictionary'
import { encode, decode } from './index'
import isEqual from 'lodash/isEqual'

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
  yello(arg1: 1.2 arg2: "test")
  yellos
}`


const parsedQuery = parse(query, {
  noLocation: true
})
const schemaQueryFields = schema.getQueryType().getFields()

generate(schema)
  .then(parsed => {
    const encoded = encode(parsedQuery, parsed)
    const decoded = decode(encoded, parsed)

    const valuesToCompare = [
      decoded[0][2].arguments[0],
      parsedQuery.definitions[0].selectionSet.selections[2].arguments[0]
    ]
    const test = isEqual(valuesToCompare[0], valuesToCompare[1])
    console.log(valuesToCompare)
    console.log(
      test
        ? `Generated AST is valid. Query was ${(print(parsedQuery).length / encoded.length).toPrecision(3)} smaller in size`
        : 'Generated AST is invalid')
  })