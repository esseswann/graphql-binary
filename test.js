import reduce from 'lodash/reduce'
import { graphql, buildSchema, parse } from 'graphql'
import { encode, decode, generateDictionaries } from './index'

const schema = buildSchema(`
  input YellosArgs {
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

const introspectionQuery = `{
  __schema {
    types {	
      name
      kind
      enumValues {
      	name
      }
      fields {
        name
        args {
          name
          type {
            name
          }
        }
        type {
          kind
          name
          ofType {
            name
          }
        }
      }
    }
  }
}`

const parsedQuery = parse(query)
const schemaQueryFields = schema.getQueryType().getFields()

graphql(schema, introspectionQuery)
  .then(generateDictionaries)
  .then(console.log)

// arg = parsedQuery.definitions[0].selectionSet.selections[3].arguments[0]
// const encoded = encode(parsedQuery.definitions[0], newMap.encode)
// const decoded = decode(encoded, newfieldMap.decode)