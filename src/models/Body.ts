import {getType, rsToString, rsToArrayBufferView, encode} from '../utils'
import {formDataAsString, stringAsFormData, generateBoundary} from '../forms'
import {EdgeBlob} from './Blob'
import {EdgeReadableStream} from './ReadableStream'
import {EdgeFormData} from './FormData'

// type BodyInit = Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;
type BufferSource = ArrayBufferView | ArrayBuffer
type BodyInitNotStream = Blob | BufferSource | FormData | URLSearchParams | string

export class EdgeBody implements Body {
  protected _formBoundary?: string
  protected _raw_content: BodyInit | null | undefined

  constructor(content: BodyInit | null | undefined) {
    this._raw_content = content
  }

  get body(): ReadableStream | null {
    if (!this._raw_content) {
      return null
    } else if (typeof this._raw_content != 'string' && 'getReader' in this._raw_content) {
      return this._raw_content
    } else {
      // this will only be called once since this._raw_content is updated
      return (this._raw_content = new EdgeReadableStream({
        start: async controller => {
          const abv = await bodyToArrayBufferView(this._raw_content as BodyInitNotStream, this._formBoundary)
          controller.enqueue(abv as Uint8Array)
        },
      }))
    }
  }

  get bodyUsed(): boolean {
    return !!this.body && this.body.locked
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this._check_used('arrayBuffer')
    if (this.body) {
      const view = await rsToArrayBufferView(this.body)
      return view.buffer
    } else {
      return new ArrayBuffer(0)
    }
  }

  async blob(): Promise<Blob> {
    this._check_used('blob')
    let parts: ArrayBufferView[] = []
    if (this.body) {
      parts = [await rsToArrayBufferView(this.body)]
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
    if (this.body) {
      return await rsToString(this.body)
    } else {
      return ''
    }
  }

  protected _check_used(name: string): void {
    if (this.body?.locked) {
      throw new Error(`Failed to execute "${name}": body is already used`)
    }
  }
}

async function bodyToArrayBufferView(body: BodyInitNotStream, boundary?: string): Promise<ArrayBufferView> {
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
    const [_, form_body] = await formDataAsString(body, boundary)
    return encode(form_body)
  } else {
    throw new TypeError(`${getType(body)}s are not supported as body types`)
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
