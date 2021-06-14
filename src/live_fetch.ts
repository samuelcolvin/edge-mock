import node_fetch, {BodyInit} from 'node-fetch'
import {EdgeHeaders} from './models'
import {check_method} from './models/Request'

export default async function live_fetch(resource: string | URL, init: RequestInit | Request) {
  let headers: Record<string, string> | undefined = undefined
  if (init.headers) {
    const h = new EdgeHeaders(init.headers)
    h.delete('host')
    headers = Object.fromEntries(h)
  }

  let body: BodyInit | undefined = undefined
  if (init.body) {
    if (typeof init.body == 'string') {
      body = init.body
    } else if ('arrayBuffer' in init.body) {
      body = await init.body.arrayBuffer()
    } else {
      // TODO this is a bodge until all cases can be checked
      body = init.body as any
    }
  }

  return await node_fetch(resource, {method: check_method(init.method), headers, body})
}
