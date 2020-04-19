import { encode } from '@msgpack/msgpack'

const encodeResponse = (
  query,
  dictionary,
  response
) => {
  return encode(response)
}

export default encodeResponse