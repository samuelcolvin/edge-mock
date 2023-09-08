import stub_fetch from 'edge-mock/stub_fetch'
import live_fetch from 'edge-mock/live_fetch'
import {EdgeBlob, EdgeFile, EdgeFormData, EdgeRequest} from 'edge-mock'

describe('stub_fetch', () => {
  test('200', async () => {
    const r = await stub_fetch('https://example.com')
    expect(r.status).toEqual(200)
    expect(await r.text()).toEqual('<h1>response from example.com</h1>')
    expect(r.headers.get('content-type')).toEqual('text/html')
  })

  test('404', async () => {
    const r = await stub_fetch('https://foobar.com')
    expect(r.status).toEqual(404)
    expect(await r.text()).toEqual('404 response from GET: https://foobar.com/')
    expect(r.headers.get('content-type')).toEqual('text/plain')
  })
  test('URL', async () => {
    const url = new URL('https://example.com')
    const r = await stub_fetch(url)
    expect(r.status).toEqual(200)
    expect(await r.text()).toEqual('<h1>response from example.com</h1>')
    expect(r.headers.get('content-type')).toEqual('text/html')
  })
})

describe('live_fetch', () => {
  test('200', async () => {
    const r = await live_fetch('https://httpbin.org/get')
    expect(r.status).toEqual(200)
    expect(r.headers.get('content-type')).toEqual('application/json')
    expect(await r.json()).toEqual({
      args: {},
      headers: {
        Accept: '*/*',
        'Accept-Encoding': 'gzip,deflate',
        Host: 'httpbin.org',
        'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        'X-Amzn-Trace-Id': expect.any(String),
      },
      origin: expect.any(String),
      url: 'https://httpbin.org/get',
    })
    expect(r.url).toBe('https://httpbin.org/get')
  })

  test('headers-body-string', async () => {
    const body = 'this is a test'
    const r = await live_fetch('https://httpbin.org/post', {method: 'POST', body, headers: {foo: 'bar'}})
    expect(r.status).toEqual(200)
    const obj = (await r.json()) as any
    expect(obj.headers['Foo']).toEqual('bar')
    expect(obj.data).toEqual(body)
  })

  test('blob', async () => {
    const body = new EdgeBlob(['foo', 'bar'])
    const r = await live_fetch('https://httpbin.org/post', {method: 'POST', body})
    expect(r.status).toEqual(200)
    const obj = (await r.json()) as any
    // console.log(obj)
    expect(obj.data).toEqual('foobar')
  })

  test('existing-request', async () => {
    const request = new EdgeRequest('https://www.example.com', {method: 'POST', body: 'abc'})
    const r = await live_fetch('https://httpbin.org/post', request)
    expect(r.status).toEqual(200)
    const obj = (await r.json()) as any
    expect(obj.data).toEqual('abc')
  })

  test('post-buffer', async () => {
    const body = new Uint8Array([100, 101, 102])
    const r = await live_fetch('https://httpbin.org/post', {method: 'POST', body})
    expect(r.status).toEqual(200)
    const obj = (await r.json()) as any
    expect(obj.data).toEqual('def')
  })

  test('formdata', async () => {
    const body = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foobar.txt')
    body.append('foo', file)
    body.append('spam', 'ham')
    const headers = {'content-type': 'multipart/form-data'}
    const r = await live_fetch('https://httpbin.org/post', {method: 'POST', body, headers})
    expect(r.status).toEqual(200)
    const obj = (await r.json()) as any
    expect(obj.files).toEqual({foo: 'this is content'})
    expect(obj.form).toEqual({spam: 'ham'})
    expect(obj.headers['Content-Type']).toMatch(/multipart\/form-data; boundary=[a-z0-9]{32}/)
  })
})
