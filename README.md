# GraphQL Binary
GraphQL Binary protocol packs and unpacks GraphQL query into a schema tied ByteArrays which allows up to 5x traffic reduction and significant parsing (unpack stage) performance boost.
Msgpack is currently in use for argument values packing\unpacking

# Stage
This project is currently in proof on concept stage. Only raw queries with inline arguments are currently supported. See test.js for further information

# Usage ⚗️
Clone repository and execute
```shell
yarn && yarn dev
```

# Support
All contributions are warmly welcome. Please follow issues section or consider these:
- Test coverage compatible to graphql-js
- Documentation
- Ports for other languages
