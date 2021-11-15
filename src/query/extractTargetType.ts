import { Kind, TypeNode } from 'graphql'

// FIXME move to utils
function extractTargetType(type: TypeNode): string {
  if (type.kind === Kind.NAMED_TYPE) return type.name.value
  else return extractTargetType(type.type)
}

export default extractTargetType
