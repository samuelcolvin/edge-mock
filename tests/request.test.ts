import {EdgeReadableStream, EdgeRequest} from '../src'
import {rsToArrayBufferView} from '../src/utils'

describe('Request', () => {
  test('construct', async () => {
    const request = new EdgeRequest('/bar/', {method: 'GET'})
    expect(request.method).toEqual('GET')
    expect(request.url).toEqual('https://example.com/bar/')
    expect(Object.fromEntries(request.headers.entries())).toStrictEqual({
      accept: '*/*',
    })
    expect(request.cf.colo).toEqual('EWR')
  })

  test('body-buffer', async () => {
    const body = new Uint8Array([100, 101, 102])
    const request = new EdgeRequest('https://www.example.com', {method: 'POST', body: body.buffer})
    expect(await request.text()).toEqual('def')
  })

  test('stream', async () => {
    const body = new Uint8Array([100, 101, 102])
    const request = new EdgeRequest('https://www.example.com', {method: 'POST', body: body.buffer})
    expect(request.bodyUsed).toStrictEqual(false)
    const stream = request.body
    expect(stream).toBeInstanceOf(EdgeReadableStream)
    expect(request.bodyUsed).toStrictEqual(false)
    const buffer_view = await rsToArrayBufferView(stream as ReadableStream)
    expect(request.bodyUsed).toStrictEqual(true)
    expect(buffer_view).toEqual(body)
  })

  test('from-request', async () => {
    const r1 = new EdgeRequest('https://www.example.com', {method: 'POST', body: 'test'})
    const r2 = new EdgeRequest(r1)
    expect(r2.method).toEqual('POST')
    expect(await r2.text()).toEqual('test')
  })

  test('bad-method', async () => {
    const init = {method: 'FOOBAR'} as any
    expect(() => new EdgeRequest('/', init)).toThrow('"FOOBAR" is not a valid request method')
  })

  test('signal', async () => {
    const r1 = new EdgeRequest('https://www.example.com', {method: 'POST', body: 'test'})
    expect(() => r1.signal).toThrow('signal not yet implemented')
  })

  test('clone', async () => {
    const init = {method: 'POST', body: 'test', cf: {colo: 'ABC'}} as any
    const r1 = new EdgeRequest('https://www.example.com', init)
    expect(r1.cf.colo).toEqual('ABC')
    const r2 = r1.clone()
    expect(r2.method).toEqual('POST')
    expect(await r2.text()).toEqual('test')
    expect(r2.cf.colo).toEqual('ABC')
  })

  test('get-body', async () => {
    const init = {method: 'FOOBAR'} as any
    expect(() => new EdgeRequest('/', {body: 'xx'})).toThrow('Request with GET/HEAD method cannot have body.')
  })
})
