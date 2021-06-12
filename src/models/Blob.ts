// https://developer.mozilla.org/en-US/docs/Web/API/Blob
import {EdgeReadableStream} from './ReadableStream'
import {encode, decode, catUint8Arrays} from '../utils'
import {BlobOptions} from 'buffer'

export class EdgeBlob implements Blob {
  protected readonly chunks: Uint8Array[]
  readonly type: string
  protected readonly encoding: string

  constructor(chunks: BlobPart[], options: BlobOptions = {}) {
    this.chunks = []
    this.type = options.type || ''
    this.encoding = options.encoding || 'utf8' // currently unused
    for (const chunk of chunks) {
      if (chunk instanceof ArrayBuffer) {
        this.chunks.push(new Uint8Array(chunk))
      } else if (chunk instanceof EdgeBlob) {
        this.chunks.push((chunk as any)._Uint8Array())
      } else {
        this.chunks.push(encode(chunk as string))
      }
    }
  }

  protected _text(): string {
    return this.chunks.map(decode).join('')
  }

  protected _Uint8Array(): Uint8Array {
    return catUint8Arrays(this.chunks)
  }

  get size(): number {
    return this._Uint8Array().length
  }

  async text(): Promise<string> {
    return this._text()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._Uint8Array().buffer
  }

  stream(): ReadableStream {
    return new EdgeReadableStream(this.chunks)
  }

  slice(start = 0, end: number | undefined = undefined, contentType?: string): Blob {
    const options = contentType ? {type: contentType} : {}
    return new Blob(this.chunks.slice(start, end), options)
  }
}
