import { decode } from '@msgpack/msgpack'

const decodeResponse = (
  query,
  response
) => {
  
  return decode(response)
}

export default decodeResponse