# GraphQL Binary
GraphQL Binary protocol packs and unpacks GraphQL query into a schema-tied ByteArrays which allows up to 5x traffic reduction and significant parsing (unpack stage) performance boost

Moreover the response is also optimised by removing the keys, storing integers in bytes, having c-like strings\arrays and so on similarly to Protobuf in terms of schema and to MessagePack in terms of values encoding

# Stage
This project is currently in proof on concept stage. Mutations, Query Arguments, Variables, custom types are not supported. We have no intent on supporting Union and Interface types in the first release

# Concept 
```graphql
query BasicQuery {
  int
  float
  boolean
  string
  withArgs (
    int: 1
    boolean: true
    string: "string"
  )
  map {
    id
    map {
      id
      map {
        id
      }
    }
  }
}
```

is converted to this
```javascript
Uint8Array(30) [
  0, 1, 2, 3, 5, 6, 1, 1, 8, 1,
  195, 9, 7, 166, 115, 116, 114, 105, 110, 103,
  4, 0, 1, 0, 1, 0, 255, 255, 255, 255
]
```
by using a recursive dictionary generated from GraphQL schema where each Field is assigned a 8-bit integer index starting from top level Type definitions and boiling down to each individual type. Besides the indices the dictionary generates value helper definitions which allow encoding\decoding arguments and response fields.

Here is an example of the dictionary entry
```js
int: {
  name: 'int',
  byte: 0,
  isArg: false,
  kind: 'SCALAR',
  type: 'Int',
  typeHandler: {
    astName: 'IntValue',
    check: [Function: check],
    parse: [Function: parse],
    encode: [Function: encode],
    decode: [Function: decode]
  }
}
```
Obviously it can be optimised yet

# Usage ⚗️
Clone repository and execute
```shell
yarn && yarn dev <file you want to be working on>
```
Then after you're finished 
```shell
yarn test
```
Don't forget to force Jest to rerun tests by inputting `a` in the Jest console

# Support
All contributions are warmly welcome. Please follow issues section or consider these:
- Test coverage compatible to graphql-js
- Documentation
- Ports for other languages
