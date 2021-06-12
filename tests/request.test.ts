import {EdgeRequest} from '../src'

describe('Request', () => {
  test('construct', async () => {
    const request = new EdgeRequest('/bar/', {method: 'GET'})
    expect(request.method).toEqual('GET')
    expect(request.url).toEqual('https://example.com/bar/')
    expect(Object.fromEntries(request.headers.entries())).toStrictEqual({
      accept: '*/*',
    })
  })
})
