// https://developer.mozilla.org/en-US/docs/Web/API/Blob
import {decode, catUint8Arrays, bodyToArrayBuffer, rsFromArray} from '../utils'
import {BlobOptions} from 'buffer'

export class EdgeBlob implements Blob {
  protected readonly parts: BlobPart[]
  readonly type: string
  protected readonly encoding: string

  constructor(parts: BlobPart[], options: BlobOptions = {}) {
    this.parts = parts
    this.type = options.type || ''
    this.encoding = options.encoding || 'utf8' // currently unused
    this._content = catUint8Arrays(parts.map(p => new Uint8Array(bodyToArrayBuffer(p))))
  }

  get size(): number {
    return this._content.length
  }

  async text(): Promise<string> {
    return decode(await this.arrayBuffer())
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._content.buffer
  }

  stream(): ReadableStream {
    return rsFromArray([this._content])
  }

  slice(start = 0, end: number | undefined = undefined, contentType?: string): Blob {
    const options = contentType ? {type: contentType} : {}
    return new EdgeBlob(this.parts.slice(start, end), options)
  }
}
