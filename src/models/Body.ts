import {decode} from '../utils'
import {EdgeReadableStream, readableStreamAsBlobParts, readableStreamAsString} from './ReadableStream'
import {EdgeBlob} from './Blob'

const BodyTypes = new Set(['String', 'EdgeBlob', 'EdgeReadableStream', 'ArrayBuffer', 'Null', 'Undefined'])

type BodyInternalType = string | Blob | ReadableStream | ArrayBuffer | null

export class EdgeBody implements Body {
  protected readonly _body_content: BodyInternalType
  protected _bodyUsed: boolean

  constructor(content: BodyInit | null | undefined) {
    const body_type = get_type(content)
    if (!BodyTypes.has(body_type)) {
      throw new TypeError(`Invalid body type "${body_type}", must be one of: Blob, ReadableStream, string, null`)
    }
    this._body_content = (content as BodyInternalType) || null
    this._bodyUsed = false
  }

  get body(): ReadableStream {
    return new EdgeReadableStream([this._body_content])
  }

  get bodyUsed(): boolean {
    return this._bodyUsed
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this.check_used('arrayBuffer')
    const blob = await this._blob()
    return blob.arrayBuffer()
  }

  async blob(): Promise<Blob> {
    this.check_used('blob')
    return await this._blob()
  }

  async json(): Promise<any> {
    this.check_used('json')
    return JSON.parse(await this._text())
  }

  async text(): Promise<string> {
    this.check_used('text')
    return await this._text()
  }

  async formData(): Promise<FormData> {
    throw new Error('formData not implemented yet')
  }

  protected async _text(): Promise<string> {
    if (typeof this._body_content == 'string') {
      return this._body_content
    } else if (this._body_content instanceof EdgeBlob) {
      return await this._body_content.text()
    } else if (this._body_content instanceof ArrayBuffer) {
      return decode(this._body_content)
    } else if (this._body_content instanceof EdgeReadableStream) {
      return readableStreamAsString(this._body_content)
    } else {
      return ''
    }
  }

  protected async _blob(): Promise<Blob> {
    if (typeof this._body_content == 'string') {
      return new EdgeBlob([this._body_content])
    } else if (this._body_content instanceof ArrayBuffer) {
      return new EdgeBlob([this._body_content])
    } else if (this._body_content instanceof EdgeBlob) {
      return this._body_content
    } else if (this._body_content instanceof EdgeReadableStream) {
      const parts = await readableStreamAsBlobParts(this._body_content)
      throw new EdgeBlob(parts)
    } else {
      return new Blob([])
    }
  }

  protected check_used(name: string): void {
    if (this._bodyUsed) {
      throw new Error(`Failed to execute "${name}": body is already used`)
    }
    this._bodyUsed = true
  }
}

function get_type(obj: any): string {
  if (obj === null) {
    return 'Null'
  } else if (obj === undefined) {
    return 'Undefined'
  } else {
    return Object.getPrototypeOf(obj).constructor.name
  }
}
