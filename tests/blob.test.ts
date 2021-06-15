import {EdgeBlob, EdgeReadableStream} from '../src'
import {rsToString} from '../src/utils'

describe('EdgeBlob', () => {
  test('string', async () => {
    const blob = new EdgeBlob(['hello', ' ', 'world'])
    expect(blob.type).toEqual('')
    expect(await blob.text()).toEqual('hello world')
    expect(blob.size).toEqual(11)
  })

  test('string-arrayBuffer', async () => {
    const blob = new EdgeBlob(['a', 'b', 'c'], {type: 'foo/bar'})
    expect(blob.type).toEqual('foo/bar')
    expect(blob.size).toEqual(3)
    const buffer = await blob.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([97, 98, 99]))
  })

  test('string-stream', async () => {
    const blob = new EdgeBlob(['a', 'b', 'c'])
    expect(blob.size).toEqual(3)
    const stream = blob.stream()
    expect(stream).toBeInstanceOf(EdgeReadableStream)
    expect(await rsToString(stream)).toEqual('abc')
  })

  test('Uint8Array', async () => {
    const uint = new Uint8Array([120, 121])
    const blob = new EdgeBlob([uint.buffer, ' ', uint])
    expect(await blob.text()).toEqual('xy xy')
    expect(blob.size).toEqual(5)
    const buffer = await blob.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([120, 121, 32, 120, 121]))
  })

  test('blob-of-blobs', async () => {
    const blob1 = new EdgeBlob(['a', 'b'])
    const blob = new EdgeBlob([blob1, ' ', blob1])
    expect(await blob.text()).toEqual('ab ab')
    expect(blob.size).toEqual(5)
  })

  test('size', async () => {
    const blob = new EdgeBlob(['£', '1'])
    expect(await blob.text()).toEqual('£1')
    expect(blob.size).toEqual(3)
  })

  test('varied-types', async () => {
    const uint = new Uint8Array([110, 111])
    const blob1 = new EdgeBlob(['a', uint])
    const blob = new EdgeBlob(['x', blob1, uint])
    expect(await blob.text()).toEqual('xanono')
    expect(blob.size).toEqual(6)
  })

  test('slice', async () => {
    const blob = new EdgeBlob(['123', '456'])
    const b2 = blob.slice(2)
    expect(await b2.text()).toEqual('3456')
    expect(b2.type).toEqual('')
    expect(b2.size).toEqual(4)
  })

  test('slice-type', async () => {
    const blob = new EdgeBlob(['123', '456'])
    const b2 = blob.slice(0, 3, 'foo/bar')
    expect(await b2.text()).toEqual('123')
    expect(b2.type).toEqual('foo/bar')
    expect(b2.size).toEqual(3)
  })
})
