import {EdgeKVNamespace, EdgeReadableStream} from '../src'
import {readableStreamAsString} from '../src/models/ReadableStream'

describe('EdgeKVNamespace', () => {
  test('get-value', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'Foo Value'}})
    const v = await kv.get('foo')
    expect(v).toEqual('Foo Value')
  })

  test('get-missing', async () => {
    const kv = new EdgeKVNamespace()
    const v = await kv.get('foo')
    expect(v).toStrictEqual(null)
  })

  test('get-json', async () => {
    const kv = new EdgeKVNamespace({foo: {value: '{"spam": 123}'}})
    const v = await kv.get('foo', 'json')
    expect(v).toStrictEqual({spam: 123})
  })

  test('get-arrayBuffer', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'abc'}})
    const v = await kv.get('foo', 'arrayBuffer')
    const array = new Uint8Array([97, 98, 99])
    expect(new Uint8Array(v)).toStrictEqual(array)
  })

  test('get-stream', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'abc'}})
    const v = await kv.get('foo', 'stream')
    expect(v instanceof EdgeReadableStream).toStrictEqual(true)
    expect(await readableStreamAsString(v)).toEqual('abc')
  })

  test('getWithMetadata-with', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'abc', metadata: {m: 'n'}}})
    const v = await kv.getWithMetadata('foo')
    expect(v).toStrictEqual({value: 'abc', metadata: {m: 'n'}})
  })

  test('getWithMetadata-without', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'abc'}})
    const v = await kv.getWithMetadata('foo')
    expect(v).toStrictEqual({value: 'abc', metadata: {}})
  })

  test('getWithMetadata-missing', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'abc'}})
    const v = await kv.getWithMetadata('missing')
    expect(v).toStrictEqual({value: null, metadata: null})
  })

  test('put', async () => {
    const kv = new EdgeKVNamespace()
    await kv.put('foo', 'bar')
    expect(await kv.getWithMetadata('foo')).toStrictEqual({value: 'bar', metadata: {}})
  })

  test('put-metadata', async () => {
    const kv = new EdgeKVNamespace()
    await kv.put('foo', 'bar', {metadata: {apple: 'pear'}})
    expect(await kv.getWithMetadata('foo')).toStrictEqual({value: 'bar', metadata: {apple: 'pear'}})
  })

  test('put-arrayBuffer', async () => {
    const kv = new EdgeKVNamespace()
    const array = new Uint8Array([97, 98, 99])
    await kv.put('foo', array.buffer)
    expect(await kv.get('foo')).toEqual('abc')
    expect(await kv.get('foo')).toEqual('abc')
    expect(new Uint8Array(await kv.get('foo', 'arrayBuffer'))).toEqual(array)
  })

  test('put-stream', async () => {
    const kv = new EdgeKVNamespace()
    const stream = new EdgeReadableStream(['a', 'b', 'cde'])
    await kv.put('foo', stream)
    expect(await kv.get('foo')).toEqual('abcde')
    expect(await kv.get('foo')).toEqual('abcde')
  })

  test('_clear', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'Foo Value'}})
    expect(await kv.get('foo')).toEqual('Foo Value')
    kv._clear()
    expect(await kv.get('foo')).toStrictEqual(null)
  })
})
