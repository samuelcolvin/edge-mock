import {makeEdgeEnv, EdgeFetchEvent} from 'edge-mock'
import {handleRequest} from './example'

describe('handleRequest', () => {
  beforeEach(() => {
    makeEdgeEnv()
    jest.resetModules()
  })

  test('post', async () => {
    const request = new Request('/?foo=1', {method: 'POST', body: 'hello'})
    const event = new EdgeFetchEvent('fetch', {request})
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
