import { Kind, TypeNode } from 'graphql'

function extractTargetType(type: TypeNode): string {
  if (type.kind === Kind.NAMED_TYPE) return type.name.value
  else return extractTargetType(type.type)
}

export default extractTargetType
