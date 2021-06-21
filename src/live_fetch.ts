import node_fetch, {BodyInit} from 'node-fetch'
import {rsToArrayBufferView} from './utils'
import {EdgeFormData, EdgeResponse} from './models'
import {check_method} from './models/Request'
import {formDataAsMultipart} from './forms'
import {asHeaders} from './models/Headers'

export default async function (resource: string | URL, init: RequestInit | Request = {}): Promise<Response> {
  const method = check_method(init.method)
  let headers: Record<string, string> = {}
  if (init.headers) {
    const h = asHeaders(init.headers)
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
      body = await rsToArrayBufferView(init_body)
    } else if (init_body instanceof EdgeFormData) {
      const [boundary, form_body] = await formDataAsMultipart(init_body)
      if (headers['content-type'] == 'multipart/form-data') {
        headers['content-type'] = `multipart/form-data; boundary=${boundary}`
      }
      body = form_body
    } else {
      // TODO this is a bodge until all cases can be checked
      body = init_body as any
    }
  }

  const r = await node_fetch(resource, {method, headers, body})
  const response_headers = Object.fromEntries(r.headers)
  const response_body = await r.arrayBuffer()
  return new EdgeResponse(response_body, {status: r.status, headers: response_headers}, r.url)
}
