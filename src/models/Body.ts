import {getType, rsToString, rsToArrayBufferView, encode} from '../utils'
import {EdgeBlob} from './Blob'
import {EdgeReadableStream} from './ReadableStream'

export class EdgeBody implements Body {
  protected _stream: ReadableStream<Uint8Array> | null = null

  constructor(content: BodyInit | null | undefined) {
    if (content) {
      if (typeof content != 'string' && 'getReader' in content) {
        this._stream = content
      } else {
        this._stream = new EdgeReadableStream({
          async start(controller) {
            const abv = await bodyToArrayBufferView(content)
            controller.enqueue(abv as Uint8Array)
          },
        })
      }
    }
  }

  get body(): ReadableStream | null {
    return this._stream
  }

  get bodyUsed(): boolean {
    return !!this._stream && this._stream.locked
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this._check_used('arrayBuffer')
    if (this._stream) {
      const view = await rsToArrayBufferView(this._stream)
      return view.buffer
    } else {
      return new ArrayBuffer(0)
    }
  }

  async blob(): Promise<Blob> {
    this._check_used('blob')
    let parts: ArrayBufferView[] = []
    if (this._stream) {
      parts = [await rsToArrayBufferView(this._stream)]
    }
    return new EdgeBlob(parts)
  }

  async json(): Promise<any> {
    this._check_used('json')
    return JSON.parse(await this._text())
  }

  async text(): Promise<string> {
    this._check_used('text')
    return await this._text()
  }

  async formData(): Promise<FormData> {
    throw new Error('formData not implemented yet')
  }

  protected async _text(): Promise<string> {
    if (this._stream) {
      return await rsToString(this._stream)
    } else {
      return ''
    }
  }

  protected _check_used(name: string): void {
    if (this._stream?.locked) {
      throw new Error(`Failed to execute "${name}": body is already used`)
    }
  }
}

// type BodyInit = Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;
type BodyInitNotStream = Blob | BufferSource | FormData | URLSearchParams | string
export async function bodyToArrayBufferView(body: BodyInitNotStream): Promise<ArrayBufferView> {
  if (typeof body == 'string') {
    return encode(body)
  } else if ('buffer' in body) {
    return body
  } else if ('byteLength' in body) {
    return new Uint8Array(body)
  } else if ('arrayBuffer' in body) {
    return new Uint8Array(await body.arrayBuffer())
  } else if (body instanceof URLSearchParams) {
    return encode(body.toString())
  } else {
    throw new TypeError(`${getType(body)}s are not supported as body types`)
  }
}
