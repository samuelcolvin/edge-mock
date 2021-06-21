import {getType, rsToString, rsToArrayBufferView, encode} from '../utils'
import {formDataAsString, stringAsFormData, generateBoundary} from '../forms'
import {EdgeBlob} from './Blob'
import {EdgeReadableStream} from './ReadableStream'
import {EdgeFormData} from './FormData'

// type BodyInit = Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;
type BodyInitNotStream = Blob | BufferSource | FormData | URLSearchParams | string

export class EdgeBody implements Body {
  protected _formBoundary?: string
  protected _stream: ReadableStream<Uint8Array> | null = null

  constructor(content: BodyInit | null | undefined, formBoundary?: string) {
    this._formBoundary = formBoundary
    if (content) {
      if (typeof content != 'string' && 'getReader' in content) {
        this._stream = content
      } else {
        this._stream = new EdgeReadableStream({
          start: async controller => {
            const abv = await this._bodyToArrayBufferView(content)
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
    if (this._formBoundary) {
      return stringAsFormData(this._formBoundary, await this.text())
    } else {
      throw new Error('unable to parse form data, invalid content-type header')
    }
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

  protected async _bodyToArrayBufferView(body: BodyInitNotStream): Promise<ArrayBufferView> {
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
    } else if (body instanceof EdgeFormData) {
      const [_, form_body] = await formDataAsString(body, this._formBoundary)
      return encode(form_body)
    } else {
      throw new TypeError(`${getType(body)}s are not supported as body types`)
    }
  }
}

export function findBoundary(headers: Headers, content: BodyInit | null | undefined): string | undefined {
  const content_type = headers.get('content-type')
  const m_boundary = content_type ? content_type.match(/^multipart\/form-data; ?boundary=(.+)$/i) : null
  if (m_boundary) {
    return m_boundary[1]
  } else if (content instanceof EdgeFormData) {
    const boundary = generateBoundary()
    if (!content_type || content_type == 'multipart/form-data') {
      headers.set('content-type', `multipart/form-data; boundary=${boundary}`)
    }
    return boundary
  }
}
