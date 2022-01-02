// https://developer.mozilla.org/en-US/docs/Web/API/Blob
import {encode, decode, catArraysBufferViews} from '../utils'
import {BlobOptions} from 'buffer'
import {EdgeReadableStream} from './ReadableStream'

type BufferSource = ArrayBufferView | ArrayBuffer
type BlobPart = BufferSource | Blob | string
type EndingType = "native" | "transparent"

interface BlobPropertyBag {
    endings?: EndingType
    type?: string
}

interface FilePropertyBag extends BlobPropertyBag {
    lastModified?: number
}

export class EdgeBlob implements Blob {
  readonly type: string
  protected readonly _parts: BlobPart[]
  protected readonly _encoding: string

  constructor(parts: BlobPart[], {type, encoding}: BlobOptions = {}) {
    this._parts = parts
    this.type = type || ''
    this._encoding = encoding || 'utf8' // currently unused
  }

  get size(): number {
    let size = 0
    for (const part of this._parts) {
      if (typeof part == 'string') {
        size += encode(part).length
      } else if ('size' in part) {
        size += part.size
      } else {
        size += part.byteLength
      }
    }
    return size
  }

  async text(): Promise<string> {
    return decode(await this.arrayBuffer())
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buffers_views = await Promise.all(this._parts.map(partToArrayBufferView))
    return catArraysBufferViews(buffers_views).buffer
  }

  stream(): ReadableStream {
    const iterator = this._parts[Symbol.iterator]()
    return new EdgeReadableStream({
      async pull(controller) {
        const {value, done} = iterator.next()

        if (done) {
          controller.close()
        } else {
          const buffer_view = await partToArrayBufferView(value)
          controller.enqueue(buffer_view)
        }
      },
    })
  }

  slice(start = 0, end: number | undefined = undefined, contentType?: string): Blob {
    const size = this.size
    if (start < 0) {
      start = size + start
    }
    end = end || size
    if (end < 0) {
      end = size + end
    }
    const options = contentType ? {type: contentType} : {}
    let offset = 0
    if (end <= start) {
      return new EdgeBlob([], options)
    }
    const new_parts: BlobPart[] = []
    for (const part of this._parts) {
      if (end <= offset) {
        break
      }
      let part_array: Uint8Array | ArrayBuffer | Blob
      let part_size: number
      if (typeof part == 'string') {
        part_array = encode(part)
        part_size = part_array.byteLength
      } else if ('arrayBuffer' in part) {
        part_array = part
        part_size = part_array.size
      } else {
        part_array = part as Uint8Array | ArrayBuffer
        part_size = part_array.byteLength
      }

      if (start < offset + part_size) {
        new_parts.push(part_array.slice(Math.max(0, start - offset), end - offset))
      }
      offset += part_size
    }
    return new EdgeBlob(new_parts, options)
  }
}

export class EdgeFile extends EdgeBlob implements File {
  readonly lastModified: number
  readonly name: string

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    super(fileBits, options)
    this.name = fileName
    this.lastModified = options?.lastModified || new Date().getTime()
  }
}

async function partToArrayBufferView(part: BlobPart): Promise<ArrayBufferView> {
  if (typeof part == 'string') {
    return encode(part)
  } else if ('buffer' in part) {
    return part
  } else if ('byteLength' in part) {
    return new Uint8Array(part)
  } else {
    return new Uint8Array(await part.arrayBuffer())
  }
}
