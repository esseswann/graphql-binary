export const definitions = {
  // Date with seconds precision spanning from Jan 01 1970 till ~Feb 07 2106
  // that takes up an 4 byte integer unlike JSON representation which would
  // take 10 bytes for seconds or 13 bytes for milliseconds timestamp.
  // It is also nicely decoded directly to Date() object
  UDateS: {
    astName: 'IntValue',
    encode: data => {
      const timestampSeconds = data.getTime() / 1000
      return new Uint8Array([
        (timestampSeconds & 0xff000000) >> 24,
        (timestampSeconds & 0x00ff0000) >> 16,
        (timestampSeconds & 0x0000ff00) >> 8,
        timestampSeconds & 0x000000ff,
      ])
    },
    decode: (offset, data) => {
      const view = new DataView(data.buffer)
      return [new Date(view.getInt32(offset) * 1000), offset + 4]
    },
  },
}

export const data = {
   // Note that we set seconds to zero or tests will fail because we loose precision
  date: new Date('December 17, 1995 03:24:00') 
}
