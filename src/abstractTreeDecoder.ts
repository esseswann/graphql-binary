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
  VALUED = 1 << 1,
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
  