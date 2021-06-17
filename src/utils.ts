import {TextDecoder, TextEncoder} from 'util'
import {EdgeReadableStream} from './models'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encode(input: string): Uint8Array {
  return encoder.encode(input)
}

export function decode(input: Uint8Array | ArrayBuffer): string {
  return decoder.decode(input)
}

export function catUint8Arrays(arrays: ArrayBufferView[]): Uint8Array {
  const byteLength = arrays.reduce((byteLength, a) => byteLength + a.byteLength, 0)
  const combinedArray = new Uint8Array(byteLength)
  let pos = 0
  for (const a of arrays) {
    combinedArray.set(a as Uint8Array, pos)
    pos += a.byteLength
  }
  return combinedArray
}

export async function rsToString(rs: ReadableStream): Promise<string> {
  const ab = await rsToArrayBuffer(rs)
  return decode(ab)
}

// TODO change to arraybuffer view
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
    throw new TypeError(`Unexpected type "${getType(value)}", expected string, ArrayBuffer or Uint8Array`)
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
