import {EdgeReadableStream, EdgeRequest} from '../src'

describe('Request', () => {
  test('construct', async () => {
    const request = new EdgeRequest('/bar/', {method: 'GET'})
    expect(request.method).toEqual('GET')
    expect(request.url).toEqual('https://example.com/bar/')
    expect(Object.fromEntries(request.headers.entries())).toStrictEqual({
      accept: '*/*',
    })
  })

  test('body-buffer', async () => {
    const body = new Uint8Array([100, 101, 102])
    const request = new EdgeRequest('https://www.example.com', {method: 'POST', body: body.buffer})
    expect(await request.text()).toEqual('def')
  })

  // test('stream', async () => {
  //   const body = new Uint8Array([100, 101, 102])
  //   const request = new EdgeRequest('https://www.example.com', {method: 'POST', body: body.buffer})
  //   expect(request.bodyUsed).toStrictEqual(false)
  //   const stream = request.body
  //   expect(stream).toBeInstanceOf(EdgeReadableStream)
  //   expect(request.bodyUsed).toStrictEqual(true)
  //   const buffer = await (stream as EdgeReadableStream)._toArrayBuffer()
  //   expect(new Uint8Array(buffer)).toEqual(body)
  // })
})
