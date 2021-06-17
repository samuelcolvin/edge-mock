import {EdgeResponse} from './models'
import {check_method} from './models/Request'

export default async function stub_fetch(resource: string | URL, init: RequestInit | Request = {}): Promise<Response> {
  const method = check_method(init.method)
  let url: URL
  if (typeof resource == 'string') {
    url = new URL(resource)
  } else {
    url = resource
  }
  if (url.href == 'https://example.com/') {
    return new EdgeResponse(
      '<h1>response from example.com</h1>',
      {status: 200, headers: {'content-type': 'text/html'}},
      url.href,
      {init},
    )
  } else {
    return new EdgeResponse(
      `404 response from ${method}: ${url.href}`,
      {status: 404, headers: {'content-type': 'text/plain'}},
      url.href,
      {init},
    )
  }
}
