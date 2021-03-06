import {EdgeResponse, EdgeReadableStream, EdgeBlob, EdgeFormData, EdgeFile} from 'edge-mock'
import {rsFromArray, rsToString} from 'edge-mock/utils'

describe('EdgeResponse', () => {
  test('string', async () => {
    const response = new EdgeResponse('abc')
    expect(response.status).toStrictEqual(200)
    expect(response.headers.get('content-type')).toEqual('text/plain')
    expect(response.statusText).toStrictEqual('')
    expect(response.type).toStrictEqual('default')
    expect(response.bodyUsed).toStrictEqual(false)
    expect(await response.text()).toEqual('abc')
    expect(response.bodyUsed).toStrictEqual(true)
  })

  test('string-arrayBuffer', async () => {
    const response = new EdgeResponse('abc')
    expect(response.bodyUsed).toStrictEqual(false)
    const buffer = await response.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([97, 98, 99]))
    expect(response.bodyUsed).toStrictEqual(true)
  })

  test('blob-string', async () => {
    const blob = new EdgeBlob([new Uint8Array([97, 98, 99])])
    const response = new EdgeResponse(blob)
    expect(await response.text()).toEqual('abc')
    expect(response.headers.get('content-type')).toEqual(null)
  })

  test('blob-arrayBuffer', async () => {
    const uint = new Uint8Array([97, 98, 99])
    const blob = new EdgeBlob([uint])
    const response = new EdgeResponse(blob)
    const buffer = await response.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(uint)
  })

  test('null-string', async () => {
    const response = new EdgeResponse(null)
    expect(await response.text()).toEqual('')
  })

  test('stream-string', async () => {
    const chunks = [new Uint8Array([97, 98]), new Uint8Array([100, 101])]
    const stream = rsFromArray(chunks)
    const response = new EdgeResponse(stream)
    expect(await response.text()).toEqual('abde')
  })

  test('stream-array-buffer', async () => {
    const chunks = [new Uint8Array([97, 98]), new Uint8Array([100, 101])]
    const stream = rsFromArray(chunks)
    const response = new EdgeResponse(stream)
    const buffer = await response.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([97, 98, 100, 101]))
  })

  test('invalid-body', async () => {
    const d = new Date() as any
    const r = new EdgeResponse(d)
    await expect(r.text()).rejects.toThrow('Dates are not supported as body types')
  })

  test('body', async () => {
    const response = new EdgeResponse('abc')
    expect(response.bodyUsed).toStrictEqual(false)
    const body = response.body
    expect(body).toBeInstanceOf(EdgeReadableStream)
    expect(response.bodyUsed).toStrictEqual(false)
    expect(await rsToString(body as ReadableStream)).toEqual('abc')
    expect(response.bodyUsed).toStrictEqual(true)
  })

  test('no-body', async () => {
    const response = new EdgeResponse()
    expect(response.bodyUsed).toStrictEqual(false)
    expect(response.body).toStrictEqual(null)
    expect(response.bodyUsed).toStrictEqual(false)
  })

  test('blob', async () => {
    const response = new EdgeResponse('abc')
    expect(response.bodyUsed).toStrictEqual(false)
    const blob = await response.blob()
    expect(blob).toBeInstanceOf(EdgeBlob)
    expect(response.bodyUsed).toStrictEqual(true)
    expect(await blob.text()).toEqual('abc')
  })

  test('blob-no-body', async () => {
    const response = new EdgeResponse()
    expect(response.bodyUsed).toStrictEqual(false)
    const blob = await response.blob()
    expect(blob).toBeInstanceOf(EdgeBlob)
    expect(response.bodyUsed).toStrictEqual(false)
    expect(await blob.text()).toEqual('')
  })

  test('json', async () => {
    const response = new EdgeResponse('{"foo": 123}')
    expect(response.bodyUsed).toStrictEqual(false)
    expect(await response.json()).toStrictEqual({foo: 123})
    expect(response.bodyUsed).toStrictEqual(true)
  })

  test('json-no-body', async () => {
    const response = new EdgeResponse()
    expect(response.bodyUsed).toStrictEqual(false)
    await expect(response.json()).rejects.toThrow('Unexpected end of JSON input')
    expect(response.bodyUsed).toStrictEqual(false)
  })

  test('arrayBuffer', async () => {
    const response = new EdgeResponse('abc')
    expect(response.bodyUsed).toStrictEqual(false)
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(new Uint8Array([97, 98, 99]))
    expect(response.bodyUsed).toStrictEqual(true)
  })

  test('arrayBuffer-no-body', async () => {
    const response = new EdgeResponse()
    expect(response.bodyUsed).toStrictEqual(false)
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(new Uint8Array([]))
    expect(response.bodyUsed).toStrictEqual(false)
  })

  test('formData', async () => {
    const f = new EdgeFormData()
    f.append('a', 'b')
    f.append('c', 'd')
    const response = new EdgeResponse(f)
    expect(response.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    expect([...(await response.formData())]).toStrictEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  test('formData-not-available', async () => {
    const response = new EdgeResponse()
    await expect(response.formData()).rejects.toThrow('unable to parse form data, invalid content-type header')
  })

  test('trailer', async () => {
    const response = new EdgeResponse()
    const t = async () => await response.trailer
    await expect(t()).rejects.toThrow('trailer not yet implemented')
  })

  test('redirect', async () => {
    const response = EdgeResponse.redirect('https://www.example.com')
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://www.example.com/')
  })

  test('redirect-invalid', async () => {
    const t = () => EdgeResponse.redirect('https://www.example.com', 200)
    expect(t).toThrow(new RangeError('Invalid status code'))
  })

  test('error', async () => {
    const r = EdgeResponse.error()
    expect(r.status).toBe(0)
    expect(r.body).toBeNull()
  })

  test('clone', async () => {
    const r1 = new EdgeResponse('foobar', {status: 404})
    const r2 = r1.clone()
    expect(r1.status).toBe(404)
    expect(r1.statusText).toStrictEqual('')
    expect(r2.status).toBe(404)
    expect(r1.body).not.toBeNull()
    expect(await r1.text()).toBe('foobar')
    expect(r2.body).not.toBeNull()
    expect(await r2.text()).toBe('foobar')
  })

  test('clone-no-body', async () => {
    const r1 = new EdgeResponse(undefined, {status: 405})
    const r2 = r1.clone()
    expect(r1.status).toBe(405)
    expect(r2.status).toBe(405)
    expect(r1.body).toBeNull()
    expect(await r1.text()).toBe('')
    expect(r2.body).toBeNull()
    expect(await r2.text()).toBe('')
  })

  test('clone-body-used', async () => {
    const r1 = new EdgeResponse('foobar', {status: 405})
    await r1.text()
    const t = () => r1.clone()
    expect(t).toThrow(new TypeError('Response body is already used'))
  })

  test('body-already-used', async () => {
    const response = new EdgeResponse('abc')
    expect(await response.text()).toEqual('abc')
    await expect(response.json()).rejects.toThrow('Failed to execute "json": body is already used')
  })

  test('Uint8Array', async () => {
    const response = new EdgeResponse(new Uint8Array([120, 121, 122]))
    expect(await response.text()).toEqual('xyz')
  })

  test('ReadableStream', async () => {
    const stream = rsFromArray([new Uint8Array([120, 121]), new Uint8Array([122])])
    const response = new EdgeResponse(stream)
    expect(await response.text()).toEqual('xyz')
  })

  test('URLSearchParams', async () => {
    const searchParams = new URLSearchParams('foo=1&foo=2&bar=345')
    const response = new EdgeResponse(searchParams)
    expect(await response.text()).toEqual('foo=1&foo=2&bar=345')
  })

  test('form-response', async () => {
    const body = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foobar.txt')
    body.append('foo', file)
    body.append('spam', 'ham')

    const response = new EdgeResponse(body)
    const text = await response.text()
    expect(text).toMatch(/Content-Disposition: form-data; name="foo"; filename="foobar.txt"\r\n/)
  })
})
