import {TextDecoder, TextEncoder} from 'util'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encode(input: string): Uint8Array {
  return encoder.encode(input)
}

export function decode(input: Uint8Array | ArrayBuffer): string {
  return decoder.decode(input)
}

export function catUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total_length = arrays.reduce((length: number, a: Uint8Array) => length + a.length, 0)
  const combinedArray = new Uint8Array(total_length)
  let pos = 0
  for (const a of arrays) {
    combinedArray.set(a, pos)
    pos += a.length
  }
  return combinedArray
}

/*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 * $& means the whole matched string
 */
export const escape_regex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
