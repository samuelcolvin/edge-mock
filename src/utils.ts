import {TextDecoder, TextEncoder} from 'util'
import type {EdgeBlob} from './models'
import {EdgeReadableStream} from './models'

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

// type BodyInit = Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;
// BodyInit except ReadableStream, TODO: support FormData | URLSearchParams
type BodyObj = Blob | BufferSource | FormData | URLSearchParams | string

export function bodyToArrayBuffer(body: BodyObj): ArrayBuffer {
  if (typeof body == 'string') {
    return encode(body).buffer
  } else if (body instanceof ArrayBuffer) {
    return body
  } else if ('buffer' in body) {
    return body.buffer
  } else if ('getReader' in body) {
    throw new TypeError(`bodyToArrayBuffer cant handle ReadableStream's`)
  } else {
    const blob = body as EdgeBlob
    return blob._content.buffer
  }
}

export async function rsToString(rs: ReadableStream): Promise<string> {
  const ab = await rsToArrayBuffer(rs)
  return decode(ab)
}

export async function rsToArrayBuffer(rs: ReadableStream): Promise<ArrayBuffer> {
  const reader = rs.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      return catUint8Arrays(chunks).buffer
    } else {
      chunks.push(chunkToUInt(value))
    }
  }
}

export function rsFromArray<R = string | Uint8Array | ArrayBuffer>(array: R[]): ReadableStream {
  const iterator = array[Symbol.iterator]()
  return new EdgeReadableStream({
    pull(controller) {
      const {value, done} = iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

function chunkToUInt(value: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof value == 'string') {
    return encode(value)
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  } else if ('buffer' in value) {
    return value
  } else {
    throw new TypeError(`Unexpected by "${getType(value)}", expected string, ArrayBuffer or Uint8Array`)
  }
}

export function getType(obj: any): string {
  if (obj === null) {
    return 'Null'
  } else if (obj === undefined) {
    return 'Undefined'
  } else {
    return Object.getPrototypeOf(obj).constructor.name
  }
}

/*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 * $& means the whole matched string
 */
export const escape_regex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
