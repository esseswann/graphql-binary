import { DocumentNode, parse, buildSchema } from 'graphql'
import fs from 'fs'

function parseGraphQlFile(fileName: string): DocumentNode {
  const file = fs.readFileSync(`${__dirname}/${fileName}.graphql`, 'utf8')
  return parse(file, { noLocation: true })
}

export const basicQuery = parseGraphQlFile('basicQuery')
export const basicQueryWithArgs = parseGraphQlFile('basicQueryWithArgs')
export const mutation = parseGraphQlFile('mutation')
export const queryWithVariables = parseGraphQlFile('queryWithVariables')
export const subscription = parseGraphQlFile('subscription')
export const schema = buildSchema(
  fs.readFileSync(`${__dirname}/schema.graphql`, 'utf8')
)
