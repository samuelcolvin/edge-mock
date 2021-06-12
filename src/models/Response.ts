// stubs https://developer.mozilla.org/en-US/docs/Web/API/Response
import {EdgeBody} from './Body'
import {as_headers} from './Headers'

const RedirectStatuses: Set<number> = new Set([301, 302, 303, 307, 308])

export class EdgeResponse extends EdgeBody implements Response {
  readonly status: number
  readonly ok: boolean
  readonly statusText: string
  readonly headers: Headers
  readonly redirected = false
  readonly type: 'basic' | 'cors' = 'basic'
  readonly url: string
  readonly _extra?: any

  constructor(body?: BodyInit | undefined | null, init: ResponseInit = {}, url = 'https://example.com', extra?: any) {
    super(body)
    this.status = init.status || 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = init.statusText || 'OK'
    this.headers = as_headers(init.headers)
    this.url = url
    if (extra) {
      this._extra = extra
    }
  }

  get trailer(): Promise<Headers> {
    throw new Error('trailer not yet implemented')
  }

  clone() {
    return new Response(this._body_content, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    })
  }

  static redirect(url: string, status = 302): Response {
    // see https://fetch.spec.whatwg.org/#dom-response-redirect
    if (!RedirectStatuses.has(status)) {
      throw new RangeError('Invalid status code')
    }
    return new Response(null, {
      status: status,
      headers: {
        location: new URL(url).href,
      },
    })
  }

  static error() {
    return new Response(null, {status: 0})
  }
}
