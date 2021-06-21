import {makeEdgeEnv} from 'edge-mock'

async function handleRequest(event: FetchEvent) {
  const {request, type} = event
  const {method, url, headers} = request
  const body = await request.text()
  const event_details = {
    type,
    request: {method, url, headers: Object.fromEntries(headers.entries()), body},
  }
  return new Response(JSON.stringify({event: event_details}, null, 2))
}

describe('makeEdgeEnv', () => {
  test('basic', async () => {
    const env = makeEdgeEnv()

    expect(env.getListener).toThrow('FetchEvent listener not yet added via addEventListener')
    addEventListener('fetch', e => {
      e.respondWith(handleRequest(e))
    })
    expect(typeof env.getListener()).toEqual('function')
    const request = new Request('/bar/', {method: 'POST', body: 'testing'})
    const event = new FetchEvent('fetch', {request})
    env.dispatchEvent(event)
    const response: Response = await (event as any)._response
    expect(response.status).toEqual(200)

    const obj = await response.json()
    expect(obj).toStrictEqual({
      event: {
        type: 'fetch',
        request: {
          method: 'POST',
          url: 'https://example.com/bar/',
          headers: {accept: '*/*'},
          body: 'testing',
        },
      },
    })
  })

  test('wrong-event-type', async () => {
    makeEdgeEnv()
    expect(() => addEventListener('foobar', null as any)).toThrow('only "fetch" events are supported, not "foobar"')
  })

  test('dispatch-no-listener', async () => {
    const env = makeEdgeEnv()
    const event = new FetchEvent('fetch', {request: new Request('/bar/')})
    expect(() => env.dispatchEvent(event)).toThrow('no event listener added')
  })
})
