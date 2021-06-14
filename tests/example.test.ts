import {EdgeEnv, makeEdgeEnv} from '../src'
import {handleRequest} from './example'

let env: EdgeEnv

describe('makeEdgeEnv', () => {
  beforeEach(() => {
    env = makeEdgeEnv()
    jest.resetModules()
  })

  test('head', async () => {
    const request = new Request('/?foo=1', {method: 'HEAD'})
    const event = new FetchEvent('fetch', {request})
    const response = await handleRequest(event)
    expect(response.status).toEqual(200)
    expect(await response.json()).toStrictEqual({
      method: 'HEAD',
      headers: {accept: '*/*'},
      searchParams: {foo: '1'},
      body: null,
    })
  })
})
