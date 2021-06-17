import {getType, rsToString, rsToArrayBufferView, encode} from '../utils'
import {EdgeBlob} from './Blob'
import {EdgeReadableStream} from './ReadableStream'

export class EdgeBody implements Body {
  protected _stream: ReadableStream | null = null

  constructor(content: BodyInit | null | undefined) {
    if (content) {
      if (typeof content != 'string' && 'getReader' in content) {
        this._stream = content
      } else {
        this._stream = new EdgeReadableStream({
          async start(controller) {
            const abv = await bodyToArrayBufferView(content)
            controller.enqueue(abv)
          },
        })
      }
    }
  }

  get body(): ReadableStream | null {
    return this._stream
  }

  get bodyUsed(): boolean {
    if (this._stream) {
      return this._stream.locked
    } else {
      return false
    }
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this._check_used('arrayBuffer')
    if (this._stream) {
      const view = await rsToArrayBufferView(this._stream)
      return view.buffer
    } else {
      return new Uint8Array([]).buffer
    }
  }

  async blob(): Promise<Blob> {
    this._check_used('blob')
    if (this._stream) {
      const ab = await rsToArrayBufferView(this._stream)
      return new EdgeBlob([ab])
    } else {
      return new EdgeBlob([])
    }
  }

  async json(): Promise<any> {
    this._check_used('json')
    let text: string
    if (this._stream) {
      text = await rsToString(this._stream)
    } else {
      text = ''
    }
    return JSON.parse(text)
  }

  async text(): Promise<string> {
    this._check_used('text')
    if (this._stream) {
      return await rsToString(this._stream)
    } else {
      return ''
    }
  }

  async formData(): Promise<FormData> {
    throw new Error('formData not implemented yet')
  }

  protected _check_used(name: string): void {
    if (this._stream?.locked) {
      throw new Error(`Failed to execute "${name}": body is already used`)
    }
  }
}

// type BodyInit = Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;
type BodyInit2 = Blob | BufferSource | FormData | URLSearchParams | string
export async function bodyToArrayBufferView(body: BodyInit2): Promise<ArrayBufferView> {
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
