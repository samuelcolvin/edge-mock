// https://developer.mozilla.org/en-US/docs/Web/API/Blob
import {EdgeReadableStream} from './ReadableStream'
import {encode, decode, catUint8Arrays} from '../utils'
import {BlobOptions} from 'buffer'

export class EdgeBlob implements Blob {
  readonly type: string
  protected readonly content: Uint8Array
  protected readonly encoding: string

  constructor(parts: BlobPart[], options: BlobOptions = {}) {
    this.type = options.type || ''
    this.encoding = options.encoding || 'utf8' // currently unused
    const chunks: Uint8Array[] = []
    for (const part of parts) {
      if (typeof part == 'string') {
        chunks.push(encode(part))
      } else if (part instanceof ArrayBuffer) {
        chunks.push(new Uint8Array(part))
      } else if ('buffer' in part) {
        chunks.push(new Uint8Array(part.buffer))
      } else {
        chunks.push((part as any).content)
      }
    }
    this.content = catUint8Arrays(chunks)
  }

  get size(): number {
    return this.content.length
  }

  async text(): Promise<string> {
    return decode(this.content)
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.content.buffer
  }

  stream(): ReadableStream {
    return new EdgeReadableStream([this.content])
  }

  slice(start = 0, end: number | undefined = undefined, contentType?: string): Blob {
    const options = contentType ? {type: contentType} : {}
    return new EdgeBlob([this.content.slice(start, end)], options)
  }
}
