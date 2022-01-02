// stubs https://developer.mozilla.org/en-US/docs/Web/API/Response
import {EdgeBody, findBoundary} from './Body'
import {asHeaders} from './Headers'

const RedirectStatuses: Set<number> = new Set([301, 302, 303, 307, 308])
type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect"

export class EdgeResponse extends EdgeBody implements Response {
  readonly status: number
  readonly ok: boolean
  readonly statusText: string
  readonly headers: Headers
  readonly redirected = false
  readonly type: ResponseType = 'default'
  readonly url: string
  readonly _extra?: any
  readonly webSocket: WebSocket | null = null

  constructor(body?: BodyInit | null, init: ResponseInit = {}, url = 'https://example.com', extra?: any) {
    const headers = asHeaders(init.headers)
    const boundary = findBoundary(headers, body)
    super(body, boundary)
    if (typeof body == 'string' && !headers.has('content-type')) {
      headers.set('content-type', 'text/plain')
    }
    this.headers = headers
    this.status = init.status === undefined ? 200 : init.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = init.statusText || ''
    this.url = url
    if (extra) {
      this._extra = extra
    }
  }

  get trailer(): Promise<Headers> {
    throw new Error('trailer not yet implemented')
  }

  clone(): Response {
    const init = {status: this.status, statusText: this.statusText, headers: this.headers}
    if (!this.body) {
      return new EdgeResponse(null, init)
    } else if (this._stream?.locked) {
      throw new TypeError('Response body is already used')
    } else {
      const [s1, s2] = this.body.tee()
      this._stream = s1
      return new EdgeResponse(s2, init)
    }
  }

  static redirect(url: string, status = 302): Response {
    // see https://fetch.spec.whatwg.org/#dom-response-redirect
    if (!RedirectStatuses.has(status)) {
      throw new RangeError('Invalid status code')
    }
    return new EdgeResponse(null, {
      status: status,
      headers: {
        location: new URL(url).href,
      },
    })
  }

  static error(): Response {
    return new EdgeResponse(null, {status: 0})
  }
}
