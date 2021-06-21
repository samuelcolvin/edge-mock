# edge-mock

[![ci](https://github.com/samuelcolvin/edge-mock/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/samuelcolvin/edge-mock/actions?query=branch%3Amain)
[![codecov](https://codecov.io/gh/samuelcolvin/edge-mock/branch/main/graph/badge.svg)](https://codecov.io/gh/samuelcolvin/edge-mock)

Tools for developing and testing edge service workers, in particular CloudFlare workers.

_edge-mock_ provides three things:
1. Implementations for types used in service-workers, e.g. `Request`, `Respones`, `FetchEvent` `ReadableStream` etc.
2. A function `makeEdgeEnv` for installing these types into the global namespace for use in unit tests
3. A simple HTTP server based on `express.js` which lets you run your service-worker based app locally for development

You can consider _edge-mock_ as implementing the most commonly used types declare in the
[`@cloudflare/workers-types`](https://www.npmjs.com/package/@cloudflare/workers-types) typescript types package.

While _edge-mock_ is designed to be useful when developing 
[CloudFlare worker](https://developers.cloudflare.com/workers/) applications, it should be usable while developing
any service-worker app including for (future) alternative edge worker implementations.

_edge-mock_ is written in TypeScript and while you may be able to use it from vanilla javascript projects, you'd be
better off writing your code in TypeScript!

## Install

    [npm/yarn] add edge-mock

## Usage

_edge-mock_ provides the following types (all available to import from `edge-mock`):

* `EdgeRequest` - implements the [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) interface
  of the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), with the addition of the
  [`cf`](https://developers.cloudflare.com/workers/runtime-apis/request#incomingrequestcfproperties) attribute
  provided in CloudFlare workers.
* `EdgeResponse` - implements the [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) interface
* `EdgeFetchEvent` - implements the [`FetchEvent`](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent) interface,
  with many attributes set to `undefined` to match `FetchEvent`s in CloudFlare workers
* `EdgeBlob` - implements the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) interface
* `EdgeFormData` implements the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) interface
* `EdgeFile` implements the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) 
  interface as used by `FormData`
* `EdgeHeaders` - implements the [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) interface
* `EdgeReadableStream` - in memory implementation of the 
  [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) interface
* `EdgeKVNamespace` - in memory implementation of CloudFlare's 
  [KVNamespace](https://developers.cloudflare.com/workers/runtime-apis/kv)
* `stub_fetch` - a very simple mock for 
  [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch) which returns `200`
  for requests to `https://example.com/` and `404` for all other requests
* `makeEdgeEnv` - which installs all the above types (except `EdgeKVNamespace`) into `global` so they can be
  used in worker scripts; types are installed into global by the name of the type they shadow, e.g. `EdgeRequest`
  is assigned to `global` as `Request`

There's also `fetch_live` (import with `import live_fetch from 'edge-mock/live_fetch'`) which is an implementation
of `fetch` which makes actual http requests using `node-fetch`. It is installed by default instead of
`stub_fetch` in the dev server, see below.

**Please Note**: all the above types are designed for use with node while testing and are vanilla in-memory
only implementations. They are not designed for production use or with large payloads.

### Example of Usage for unit testing

_edge-mock_ works well with [jest](https://jestjs.io/) to make writing unit tests for edge workers delightful.

Let's say you have the following `handler.ts` with a function `handleRequest` that you want to test:

```ts
export async function handleRequest(event: FetchEvent): Promise<Response> {
  const {request} = event
  const method = request.method
  let body: string | null = null
  if (method == 'POST') {
    body = await request.text()
  }
  const url = new URL(request.url)
  const response_info = {
    method,
    headers: Object.fromEntries(request.headers.entries()),
    searchParams: Object.fromEntries(url.searchParams.entries()),
    body,
  }
  const headers = {'content-type': 'application/json'}
  return new Response(JSON.stringify(response_info, null, 2), {headers})
}
```

(To see how this would be deployed to cloudflare, see the 
[cloudflare worker TypeScript template](https://github.com/cloudflare/worker-typescript-template))

To test the above `handleRequest` function, you could use the following:

```ts
import {makeEdgeEnv} from 'edge-mock'
import {handleRequest} from '../src/handle.ts'

describe('handleRequest', () => {
  beforeEach(() => {
    makeEdgeEnv()
    jest.resetModules()
  })

  test('post', async () => {
    // Request is available here AND in handleRequest because makeEdgeEnv installed
    // the proxy EdgeRequest into global under that name
    const request = new Request('/?foo=1', {method: 'POST', body: 'hello'})
    // same with FetchEvent, Response etc.
    const event = new FetchEvent('fetch', {request})
    const response = await handleRequest(event)
    expect(response.status).toEqual(200)
    expect(await response.json()).toStrictEqual({
      method: 'POST',
      headers: {accept: '*/*'},
      searchParams: {foo: '1'},
      body: 'hello',
    })
  })
})
```

### Development Server

The development server relies on webpack and uses webpack-watch to reload the server on code changes.

To run the server, add the following to the `scripts` section of `package.json`:

```json
  ...
  "scripts": {
    "dev": "edge-mock-server",
    ...
  },
  ...
```

**TODO:** explain how `edge-mock-config.js` works.

You can then run the dev server with:

```bash
yarn dev
```

(or `npm run dev` if you use `npm` rather than `yarn`)

# Documentation

## KV store

TODO

### Wrangler sites integration

TODO

## Request Payload

TODO

### JSON

TODO

### FormData

TODO

### Binary Data, ArrayBuffer

TODO

## Request.cf

TODO

## fetch mocking

TODO
