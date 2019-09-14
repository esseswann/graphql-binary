import { graphql } from 'graphql'
import reduce from 'lodash/fp/reduce'
import forEach from 'lodash/fp/forEach'
import get from 'lodash/fp/get'
import set from 'lodash/set'

export default schema =>
  graphql(schema, query)
    .then(get('data.__schema.types'))
    .then(reduce(typeReducer, {}))

const typeReducer = (
  result,
{
  name,
  kind,
  enumValues,
  fields,
}) => {
  if (!name.match('__') && (kind === 'OBJECT' || kind === 'LIST')) {
    result[name] = {
      encode: {},
      decode: []
    }

    forEach(field => {
      addField(field, result[name], [field.name])
      if (field.args.length > 0)
        forEach(arg =>
          addField(arg, result[name], [field.name, 'arguments', arg.name]),
          field.args)
    }, fields)
  }

  return result
}

const addField = (
  { type, ...field },
  destination,
  path = []
) => {
  const definition = {
    name: field.name,
    byte: destination.decode.length,
    isArg: path.length > 1,
    ...type.kind === 'LIST' || type.kind === 'NON_NULL'
      ? { kind: type.ofType.kind, type: type.ofType.name  }
      : { kind: type.kind, type: type.name }
  }
  destination.decode.push(definition)
  set(destination, ['encode', ...path], definition)
}

const generateDefinition = ({ type, ...field }) => ({
  name: field.name,
  ...type.kind === 'LIST'
    ? { kind: type.ofType.kind, type: type.ofType.name  }
    : { kind: type.kind, type: type.name }
})

const query = `{
  __schema {
    types {	
      name
      kind
      enumValues {
      	name
      }
      fields {
        name
        args {
          name
          type {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
        type {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
}`