import {EdgeKVNamespace, EdgeReadableStream} from '../src'

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
    expect(v).toBeInstanceOf(ArrayBuffer)
    const array = new Uint8Array([97, 98, 99])
    expect(new Uint8Array(v)).toStrictEqual(array)
  })

  test('get-stream', async () => {
    const kv = new EdgeKVNamespace({foo: {value: 'abc'}})
    const v = await kv.get('foo', 'stream')
    expect(v).toBeInstanceOf(EdgeReadableStream)
    expect(await v._toString()).toEqual('abc')
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
    const v_ab = await kv.get('foo', 'arrayBuffer')
    expect(v_ab).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(v_ab)).toEqual(array)
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

  test('list', async () => {
    const kv = new EdgeKVNamespace({foo: 'foobar', bar: 'spam'})
    expect(await kv.get('foo')).toEqual('foobar')
    expect(await kv.get('bar')).toEqual('spam')
    expect(await kv.list()).toStrictEqual({
      keys: [{name: 'foo'}, {name: 'bar'}],
      list_complete: true,
    })
  })

  test('list-cursor', async () => {
    const kv = new EdgeKVNamespace()
    await expect(kv.list({cursor: 'foobar'})).rejects.toThrow('list cursors not yet implemented')
  })

  test('list-limit', async () => {
    const kv = new EdgeKVNamespace({foo: 'foobar', bar: 'spam'})
    expect(await kv.list({limit: 1})).toStrictEqual({
      keys: [{name: 'foo'}],
      list_complete: false,
      cursor: 'not-fully-implemented',
    })
  })

  test('list-metadata', async () => {
    const kv = new EdgeKVNamespace({foo: 'foobar', bar: {value: 'spam', metadata: {apple: 'banana'}}})
    expect(await kv.get('foo')).toEqual('foobar')
    expect(await kv.get('bar')).toEqual('spam')
    expect(await kv.list()).toStrictEqual({
      keys: [{name: 'foo'}, {name: 'bar', metadata: {apple: 'banana'}}],
      list_complete: true,
    })
  })

  test('list-prefix', async () => {
    const kv = new EdgeKVNamespace({foo: 'foobar', bar: 'spam'})
    expect(await kv.list({prefix: 'f'})).toStrictEqual({
      keys: [{name: 'foo'}],
      list_complete: true,
    })
  })

  test('delete', async () => {
    const kv = new EdgeKVNamespace({foo: 'foobar'})
    expect(await kv.get('foo')).toEqual('foobar')
    await kv.delete('foo')
    expect(await kv.get('foo')).toStrictEqual(null)
  })

  test('delete', async () => {
    const kv = new EdgeKVNamespace()
    const count = await kv._from_files('.github/')
    expect(count).toEqual(1)
    expect(await kv.list()).toStrictEqual({
      keys: [{name: 'workflows/ci.yml'}],
      list_complete: true,
    })
    const content = await kv.get('workflows/ci.yml')
    expect(content).toMatch(/^name: ci/)
    const content_ab = await kv.get('workflows/ci.yml', 'arrayBuffer')
    expect(content_ab).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(content_ab)[0]).toEqual(110)

    expect(kv._manifest_json()).toEqual('{"workflows/ci.yml":"workflows/ci.yml"}')
  })
})
