export const decodeLength = (offset, bytes) => {

  if (bytes[offset] < 255)
    return [bytes[offset], offset + 1]

  const view = new DataView(bytes.buffer)

  if (bytes[offset + 1] < 255)
    return [view.getInt16(view), offset + 2]
  else if (bytes[offset + 2] < 255)
    return [view.getInt24(view), offset + 3]
  else
    return [view.getInt32(view), offset + 4]
}

export const encodeLength = length =>
  new Uint8Array(
    length < 129
      ? [length]
      : length < 32768
        ? [1, 2]
        : length < 8388608
          ? [1, 2, 3]
          : [1, 2, 3, 4])