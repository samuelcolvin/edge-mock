import {TextDecoder, TextEncoder} from 'util'
import type {EdgeReadableStream, EdgeBlob} from './models'

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

export function bodyToArrayBuffer(body: BodyInit): ArrayBuffer {
  if (typeof body == 'string') {
    return encode(body).buffer
  } else if (body instanceof ArrayBuffer) {
    return body
  } else if ('buffer' in body) {
    return body.buffer
  } else if ('getReader' in body) {
    const stream = body as EdgeReadableStream
    return stream._toArrayBuffer()
  } else {
    const blob = body as EdgeBlob
    return blob._content.buffer
  }
}

/*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 * $& means the whole matched string
 */
export const escape_regex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
