# GraphQL Binary
GraphQL Binary protocol packs and unpacks GraphQL query into a schema-tied ByteArrays which allows up to 5x traffic reduction and significant parsing (unpack stage) performance boost

Moreover the response is also optimised by removing the keys, storing integers in bytes, having c-like strings\arrays and so on similarly to Protobuf in terms of schema and to MessagePack in terms of values encoding

For some developrs the most interesting feature is encoding\decoding custom types, e.g. [Date type with seconds precision taking only 4 bytes](https://github.com/esseswann/graphql-binary/blob/master/src/fixtures/customScalarHandlers.ts#L11)

# Stage
This project is currently in proof on concept stage. We have no intent on supporting Union and Interface types in the first release. Fragments will be inlined for multiple reasons

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
by using a GraphQL schema where each Field is assigned a 8-bit integer index starting from top level Type definitions and boiling down to each individual type. 
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

# Limitations
Currently the implementation will break if schema contains a type that has more than 255 fields

# Support
All contributions are warmly welcome. Please follow issues section or consider these:
- Test coverage compatible to graphql-js
- Documentation
- Ports for other languages

Please follow the Functional style
