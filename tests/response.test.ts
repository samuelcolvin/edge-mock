import {EdgeResponse, EdgeReadableStream, EdgeBlob} from '../src'

describe('EdgeResponse', () => {
  test('string', async () => {
    const response = new EdgeResponse('abc')
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
    const stream = new EdgeReadableStream(chunks)
    const response = new EdgeResponse(stream)
    expect(await response.text()).toEqual('abde')
  })

  test('stream-array-buffer', async () => {
    const chunks = [new Uint8Array([97, 98]), new Uint8Array([100, 101])]
    const stream = new EdgeReadableStream(chunks)
    const response = new EdgeResponse(stream)
    const buffer = await response.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([97, 98, 100, 101]))
  })
})
