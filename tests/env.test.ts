import {makeEdgeEnv} from '../src'

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

    env.addEventListener('fetch', e => {
      const event_ = e as FetchEvent
      event_.respondWith(handleRequest(event_))
    })
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
          headers: {
            accept: '*/*',
          },
          body: 'testing',
        },
      },
    })
  })
})
