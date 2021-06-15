import {decode, bodyToArrayBuffer} from '../utils'
import {EdgeReadableStream} from './ReadableStream'
import {EdgeBlob} from './Blob'

const BodyTypes = new Set(['String', 'EdgeBlob', 'EdgeReadableStream', 'ArrayBuffer', 'Null', 'Undefined'])

export class EdgeBody implements Body {
  readonly _bodyContent: ArrayBuffer | null
  protected _bodyUsed: boolean

  constructor(content: BodyInit | null | undefined) {
    const body_type = get_type(content)
    if (!BodyTypes.has(body_type)) {
      throw new TypeError(
        `Invalid body type "${body_type}", must be one of: Blob, ArrayBuffer, ReadableStream, string, null or undefined`,
      )
    }
    if (content) {
      this._bodyContent = bodyToArrayBuffer(content)
    } else {
      this._bodyContent = null
    }
    this._bodyUsed = false
  }

  get body(): ReadableStream | null {
    if (this._bodyContent) {
      // shouldn't work this way, should use a single stream
      this.check_used('body')
      return new EdgeReadableStream([this._bodyContent])
    } else {
      return null
    }
  }

  get bodyUsed(): boolean {
    return this._bodyUsed
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this.check_used('arrayBuffer')
    if (this._bodyContent) {
      return this._bodyContent
    } else {
      return new Uint8Array([]).buffer
    }
  }

  async blob(): Promise<Blob> {
    this.check_used('blob')
    return new EdgeBlob(this._bodyContent ? [this._bodyContent] : [])
  }

  async json(): Promise<any> {
    this.check_used('json')
    return JSON.parse(this._text())
  }

  async text(): Promise<string> {
    this.check_used('text')
    return this._text()
  }

  async formData(): Promise<FormData> {
    throw new Error('formData not implemented yet')
  }

  protected _text(): string {
    if (this._bodyContent) {
      return decode(this._bodyContent)
    } else {
      return ''
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
