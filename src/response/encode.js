import { encode } from '@msgpack/msgpack'

const encodeResponse = (
  query,
  response
) => {

  return encode(response)
}

export default encodeResponse