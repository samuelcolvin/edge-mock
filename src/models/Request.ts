// stubs https://developer.mozilla.org/en-US/docs/Web/API/Request
import {asHeaders} from './Headers'
import {EdgeBody, findBoundary} from './Body'
import {example_cf} from './RequestCf'
import {stringAsFormData} from '../forms'

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
        cf: input.cf,
        ...init,
      }
    }

    const method = check_method(init?.method)
    if (init?.body && (method == 'GET' || method == 'HEAD')) {
      throw new TypeError('Request with GET/HEAD method cannot have body.')
    }

    const headers = asHeaders(init?.headers, DEFAULT_HEADERS)
    const boundary = findBoundary(headers, init?.body)
    super(init?.body, boundary)
    this.headers = headers
    this.url = 'https://example.com' + url
    this.method = method
    this.mode = init?.mode || 'same-origin'
    this.cache = init?.cache || 'default'
    this.referrer = init?.referrer && init?.referrer !== 'no-referrer' ? init?.referrer : ''
    // See https://fetch.spec.whatwg.org/#concept-request-credentials-mode
    this.credentials = init?.credentials || (this.mode === 'navigate' ? 'include' : 'omit')
    this.redirect = init?.redirect || 'follow'
    this.integrity = init?.integrity || '-'
    this.cf = example_cf(init?.cf as any)
  }

  get signal(): AbortSignal {
    throw new Error('signal not yet implemented')
  }

  clone(): Request {
    this._check_used('clone')
    const constructor = this.constructor as typeof EdgeRequest
    return new constructor(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
      mode: this.mode,
      credentials: this.credentials,
      cache: this.cache,
      redirect: this.redirect,
      referrer: this.referrer,
      integrity: this.integrity,
      cf: this.cf,
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
    throw new TypeError(`"${m}" is not a valid request method`)
  }
  return method as Method
}
