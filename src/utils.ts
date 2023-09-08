import {TextDecoder, TextEncoder} from 'util'
import {EdgeReadableStream} from './models'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encode(input: string): Uint8Array {
  return encoder.encode(input)
}

export function decode(input: ArrayBufferView | ArrayBuffer): string {
  return decoder.decode(input as any)
}

export async function rsToString(rs: ReadableStream): Promise<string> {
  const ab = await rsToArrayBufferView(rs)
  return decode(ab)
}

export async function rsToArrayBufferView(rs: ReadableStream): Promise<ArrayBufferView> {
  const reader = rs.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      return catArraysBufferViews(chunks)
    } else {
      if (typeof value == 'string') {
        chunks.push(encode(value))
      } else if ('buffer' in value) {
        chunks.push(value)
      } else if ('byteLength' in value) {
        chunks.push(new Uint8Array(value))
      } else {
        throw new TypeError(`Unexpected type "${getType(value)}", expected string, ArrayBuffer or Uint8Array`)
      }
    }
  }
}

export function rsFromArray(array: string[] | Uint8Array[] | ArrayBuffer[]): ReadableStream {
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

export function catArraysBufferViews(arrays: ArrayBufferView[]): Uint8Array {
  // TODO would Buffer.concat be faster here?
  const byteLength = arrays.reduce((byteLength, a) => byteLength + a.byteLength, 0)
  const combinedArray = new Uint8Array(byteLength)
  let pos = 0
  for (const a of arrays) {
    combinedArray.set(a as Uint8Array, pos)
    pos += a.byteLength
  }
  return combinedArray
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
