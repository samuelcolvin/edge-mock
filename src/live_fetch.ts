import node_fetch, {BodyInit} from 'node-fetch'
import {EdgeHeaders, EdgeResponse} from './models'
import {check_method} from './models/Request'
import {rsToArrayBuffer} from './utils'

export default async function live_fetch(resource: string | URL, init: RequestInit | Request = {}): Promise<Response> {
  let headers: Record<string, string> | undefined = undefined
  if (init.headers) {
    const h = new EdgeHeaders(init.headers)
    h.delete('host')
    headers = Object.fromEntries(h)
  }

  let body: BodyInit | undefined = undefined
  const init_body = init.body
  if (init_body) {
    if (typeof init_body == 'string') {
      body = init_body
    } else if ('arrayBuffer' in init_body) {
      // Blob
      body = await init_body.arrayBuffer()
    } else if ('getReader' in init_body) {
      body = await rsToArrayBuffer(init_body)
    } else {
      // TODO this is a bodge until all cases can be checked
      body = init_body as any
    }
  }

  const r = await node_fetch(resource, {method: check_method(init.method), headers, body})
  const response_headers = Object.fromEntries(r.headers)
  const response_body = await r.arrayBuffer()
  return new EdgeResponse(response_body, {status: r.status, headers: response_headers}, r.url)
}
