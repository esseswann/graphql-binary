import { decode } from '@msgpack/msgpack'
import types from 'types'
import forEach from 'lodash/fp/forEach'
import find from 'lodash/fp/find'

const decodeResponse = (
  query,
  dictionary,
  response
) => {
  const result = {}
  let offset = 0
  forEach(
    ({ name: { value: name  }}) => {
      const metadata = find({ name, isArg: false }, dictionary.Query.decode)
      if (!metadata)
        throw new Error(`Field ${name} was not found in the dictionary`)
      if (metadata.kind !== 'SCALAR')
        return // FIXME
      if (!metadata.typeHandler)
        throw new Error(`No handler for ${name}: ${metadata.type}`)
      if (!metadata.typeHandler.decode)
        throw new Error(`No decoder for ${name}: ${metadata.type}`)
    
      const [value, nextOffset] = metadata.typeHandler.decode(offset, response)
      result[name] = value
      offset = nextOffset
    },
    query.definitions[0].selectionSet.selections)
  return result
}

export default decodeResponse