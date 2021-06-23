function decode(
  dictionary: Metadata[],
  handler:    Handler, 
  data:       Entry[],
  index:      number,
): number {
  const current = data[index]
  const nextIndex = index + 1

  if (current === END.END || nextIndex === undefined)
    return nextIndex
  else {
    const { kind, name } = dictionary[current]
    const nextHanlder = handler(kind, name)

    return decode(
      dictionary,
      handler,
      data,
      index
    )
  }
}

type Handler = (kind: Metadata['kind'], name: Metadata['name']) => Handler

type Entry = END | number

enum END {
  END = 255
}

enum MetadataKind {
  SCALAR = 0,
  VECTOR = 1 << 0,
  LIST   = 1 << 1,
  VALUED = 1 << 2,
}

type Metadata = {
  kind: MetadataKind,
  name: string,
}

// export const decode = (
//     dictionary,
//     handler,
//     data,
//     index = 0
//   ) => {
//     const current = data[index]
//     const nextIndex = index + 1
  
//     if (current === END)
//       return nextIndex
//     else {
//       console.log(data, dictionary[current], current)
//       const { myKind: kind, name } = dictionary[current]
//       const nextHandler = handler(name, kind)
  
//       return decode(
//         dictionary,
//         handler,
//         data,
//         !(ARGUMENT & kind) && !(VECTOR & kind)
//           ? nextIndex
//           : LIST & kind
//             ? handleList(dictionary, nextHandler, data, nextIndex, kind)
//             : VECTOR & kind
//               ? decode(dictionary, nextHandler, data, nextIndex)
//               : prepareScalar(nextHandler, data, nextIndex)
//       )
//     }
//   }
  

enum Kind {
  Query        = 0 << 0,
  Mutation     = 1 << 1,
  Subscription = 1 << 2,
}

enum Flags {
  Name       = 1 << 3,
  Variables  = 1 << 4,
  Directives = 1 << 5,
}

type Positions = number[]

type Data = {
  kind: Kind
  name?: String
  variablePositions?: Positions
  directivePositions?: Positions
  data: number[]
  variables: number[]
}

let RequestKind = Kind.Query
RequestKind |= Flags.Variables
RequestKind |= Flags.Directives