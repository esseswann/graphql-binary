import { TypeNode } from 'graphql'

// FIXME move to utils
function extractTargetType(type: TypeNode) {
  if (type.kind === 'NamedType') return type.name.value
  else return extractTargetType(type.type)
}

export default extractTargetType