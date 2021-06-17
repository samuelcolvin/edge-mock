// stubs https://developer.mozilla.org/en-US/docs/Web/API/Request
import {as_headers} from './Headers'
import {EdgeBody} from './Body'
import {example_cf} from './RequestCf'

const DEFAULT_HEADERS = {
  accept: '*/*',
}

const MethodStrings = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const
export type Method = typeof MethodStrings[number]

export class EdgeRequest extends EdgeBody implements Request {
  readonly url: string
  readonly method: Method
  readonly mode: RequestMode
  readonly credentials: RequestCredentials
  readonly cache: RequestCache
  readonly redirect: 'follow' | 'error' | 'manual'
  readonly referrer: string
  readonly integrity: string
  readonly headers: Headers
  readonly cf: IncomingRequestCfProperties
  readonly destination: RequestDestination = ''
  readonly isHistoryNavigation = false
  readonly isReloadNavigation = false
  readonly keepalive = false
  readonly referrerPolicy: ReferrerPolicy = ''

  constructor(input: RequestInfo, init?: RequestInit) {
    const method = check_method(init?.method)
    if (init?.body && (method == 'GET' || method == 'HEAD')) {
      throw new TypeError("Failed to construct 'Request': Request with GET/HEAD method cannot have body.")
    }
    super(init?.body)

    let url: string
    if (typeof input == 'string') {
      url = input || '/'
    } else {
      url = input.url
      init = {
        body: input.body,
        credentials: input.credentials,
        headers: input.headers,
        method: input.method,
        mode: input.mode,
        referrer: input.referrer,
        ...init,
      }
    }
    this.url = 'https://example.com' + url
    this.method = method
    this.mode = init?.mode || 'same-origin'
    this.cache = init?.cache || 'default'
    this.referrer = init?.referrer && init?.referrer !== 'no-referrer' ? init?.referrer : ''
    // See https://fetch.spec.whatwg.org/#concept-request-credentials-mode
    this.credentials = init?.credentials || (this.mode === 'navigate' ? 'include' : 'omit')
    this.redirect = init?.redirect || 'follow'
    this.integrity = init?.integrity || '-'
    this.cf = example_cf()

    this.headers = as_headers(init?.headers, DEFAULT_HEADERS)
  }

  get signal(): AbortSignal {
    throw new Error('signal not yet implemented')
  }

  clone(): Request {
    this._check_used('clone')
    return new Request(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
      mode: this.mode,
      credentials: this.credentials,
      cache: this.cache,
      redirect: this.redirect,
      referrer: this.referrer,
      integrity: this.integrity,
    })
  }
}

const MethodsSet: Set<string> = new Set(MethodStrings)

export function check_method(m?: string): Method {
  if (m == undefined) {
    return 'GET'
  }
  const method = m.toUpperCase()
  if (!MethodsSet.has(method)) {
    throw new TypeError(`"${m}" is not a valid method, should be one of: ${MethodStrings}`)
  }
  return method as Method
}
