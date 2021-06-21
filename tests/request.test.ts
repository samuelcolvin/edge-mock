import {EdgeFile, EdgeFormData, EdgeReadableStream, EdgeRequest} from 'edge-mock'
import {encode, rsToArrayBufferView} from 'edge-mock/utils'

describe('EdgeRequest', () => {
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

  test('FormData', async () => {
    const body = new EdgeFormData()
    body.append('foo', 'bar')
    body.append('foo', 'bat')

    const request = new EdgeRequest('https://www.example.com', {method: 'POST', body})
    expect([...(await request.formData())]).toStrictEqual([
      ['foo', 'bar'],
      ['foo', 'bat'],
    ])
  })

  test('FormData-body', async () => {
    const body = new EdgeFormData()
    body.append('foo', 'bar')
    body.append('foo', 'bat')

    const r1 = new EdgeRequest('https://www.example.com', {method: 'POST', body})
    expect(r1.headers.get('content-type')).toMatch(/multipart\/form-data; boundary=\S+/)
    const boundary = (r1.headers.get('content-type') as string).match(/boundary=(\S+)/)
    expect(boundary).not.toBeNull()
    const f = await r1.text()
    expect(f.startsWith(`--${(boundary as RegExpExecArray)[1]}`))
  })

  test('FormData-raw', async () => {
    const raw_body = `
--1d1ea31edf6ccb39794b748ce125e269
Content-Disposition: form-data; name="foo"

bar
--1d1ea31edf6ccb39794b748ce125e269
Content-Disposition: form-data; name="filekey"; filename="file.txt"
Content-Type: text/plain

file content
--1d1ea31edf6ccb39794b748ce125e269--`
    const body = encode(raw_body.replace(/\r?\n/g, '\r\n'))
    const headers = {'Content-Type': 'multipart/form-data; boundary=1d1ea31edf6ccb39794b748ce125e269'}

    const request = new EdgeRequest('/', {method: 'POST', body, headers})

    const fd = await request.formData()
    expect([...fd.keys()]).toEqual(['foo', 'filekey'])
    expect(fd.get('foo')).toEqual('bar')
    const file = fd.get('filekey') as EdgeFile
    expect(file).toBeInstanceOf(EdgeFile)
    expect(file.name).toEqual('file.txt')
    expect(file.type).toEqual('text/plain')
    expect(await file.text()).toEqual('file content')
  })

  test('clone-FormData', async () => {
    const body = new EdgeFormData()
    body.append('foo', 'bar')
    body.append('foo', 'bat')

    const r1 = new EdgeRequest('https://www.example.com', {method: 'POST', body})

    const r2 = r1.clone()
    expect(r2.method).toEqual('POST')
    expect([...(await r2.formData())]).toStrictEqual([
      ['foo', 'bar'],
      ['foo', 'bat'],
    ])
  })
})
