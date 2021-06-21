import {EdgeFormData, EdgeFile, EdgeBlob} from '../src'
import {formDataAsMultipart, stringAsFormData} from '../src/forms'

describe('EdgeFormData', () => {
  test('append', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '2')
    fd.append('b', '3')
    expect([...fd]).toStrictEqual([
      ['a', '1'],
      ['a', '2'],
      ['b', '3'],
    ])
  })

  test('delete', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '2')
    fd.append('b', '3')
    fd.delete('a')
    expect([...fd]).toStrictEqual([['b', '3']])
  })

  test('get', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    expect(fd.get('a')).toEqual('1')
    fd.append('a', '2')
    expect(fd.get('a')).toEqual('1')
    expect(fd.get('b')).toBeNull()
  })

  test('getAll', () => {
    const fd = new EdgeFormData()
    expect(fd.getAll('a')).toStrictEqual([])
    fd.append('a', '1')
    expect(fd.getAll('a')).toStrictEqual(['1'])
    fd.append('a', '2')
    expect(fd.getAll('a')).toStrictEqual(['1', '2'])
  })

  test('has', () => {
    const fd = new EdgeFormData()
    expect(fd.has('a')).toStrictEqual(false)
    fd.append('a', '1')
    expect(fd.has('a')).toStrictEqual(true)
    fd.append('a', '2')
    expect(fd.has('a')).toStrictEqual(true)
  })

  test('set', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '2')
    expect([...fd]).toStrictEqual([
      ['a', '1'],
      ['a', '2'],
    ])
    fd.set('a', '3')
    expect([...fd]).toStrictEqual([['a', '3']])
  })

  test('set-order', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('b', '2')
    expect([...fd]).toStrictEqual([
      ['a', '1'],
      ['b', '2'],
    ])
    fd.set('a', '3')
    expect([...fd]).toStrictEqual([
      ['a', '3'],
      ['b', '2'],
    ])
  })

  test('append-blob', async () => {
    const fd = new EdgeFormData()
    const blob = new EdgeBlob(['this is', ' content'])
    fd.append('foo', blob)
    const f: File = fd.get('foo') as any
    expect(f.name).toEqual('blob')
    expect(await f.text()).toEqual('this is content')
    expect(Number.isInteger(f.lastModified)).toBeTruthy()
  })

  test('keys-values', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '2')
    fd.append('b', '3')
    expect([...fd.keys()]).toEqual(['a', 'b'])
    expect([...fd.values()]).toEqual(['1', '2', '3'])
  })

  test('ForEach', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '2')
    fd.append('b', '3')
    const array: any[] = []
    fd.forEach((value, key, parent) => {
      expect(parent).toBeInstanceOf(EdgeFormData)
      array.push({value, key})
    })
    expect(array).toStrictEqual([
      {value: '1', key: 'a'},
      {value: '2', key: 'a'},
      {value: '3', key: 'b'},
    ])
  })

  test('ForEach-thisArg', () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '1')
    fd.append('b', '1')

    function cb(this: any, value: FormDataEntryValue): void {
      expect(value).toEqual('1')
      expect(this).toEqual('test-this')
    }
    fd.forEach(cb, 'test-this')
  })
})

describe('formDataAsMultipart', () => {
  test('as-multipart-one', async () => {
    const fd = new EdgeFormData()
    fd.append('foo', 'bar')

    const [boundary, data] = await formDataAsMultipart(fd)
    expect(boundary).toMatch(/^[a-z0-9]{32}$/)
    expect(data).toEqual(
      `--${boundary}\r\nContent-Disposition: form-data; name="foo"\r\n\r\nbar\r\n--${boundary}--\r\n`,
    )
  })

  test('encode', async () => {
    const fd = new EdgeFormData()
    fd.append('f\noo', 'bar')

    const [boundary, data] = await formDataAsMultipart(fd)
    expect(boundary).toMatch(/^[a-z0-9]{32}$/)
    expect(data).toEqual(
      `--${boundary}\r\nContent-Disposition: form-data; name="f%0Aoo"\r\n\r\nbar\r\n--${boundary}--\r\n`,
    )
  })

  test('as-multipart-file', async () => {
    const fd = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foobar.txt')
    fd.append('foo', file)

    const [boundary, data] = await formDataAsMultipart(fd)
    expect(data).toEqual(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="foo"; filename="foobar.txt"\r\n\r\n` +
        `this is content\r\n` +
        `--${boundary}--\r\n`,
    )
  })

  test('content-type-encode', async () => {
    const fd = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foo"bar.txt', {type: 'text/plain'})
    fd.append('foo', file)

    const [boundary, data] = await formDataAsMultipart(fd)
    expect(data).toEqual(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="foo"; filename="foo%22bar.txt"\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `this is content\r\n` +
        `--${boundary}--\r\n`,
    )
  })
})

describe('stringAsFormData', () => {
  test('basic', async () => {
    const fd = new EdgeFormData()
    fd.append('foo', 'bar')
    fd.append('spam', 'ham')

    const [boundary, body] = await formDataAsMultipart(fd)

    const fd2 = stringAsFormData(boundary, body)

    expect(Object.fromEntries(fd2)).toStrictEqual({foo: 'bar', spam: 'ham'})
  })

  test('file', async () => {
    const fd = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foobar.txt')
    fd.append('foo', file)

    const [boundary, body] = await formDataAsMultipart(fd)
    const fd2 = stringAsFormData(boundary, body)
    expect([...fd2.keys()]).toStrictEqual(['foo'])
    const foo = fd2.get('foo') as EdgeFile
    expect(foo).toBeInstanceOf(EdgeFile)
    expect(foo.name).toEqual('foobar.txt')
    expect(foo.type).toEqual('')
    expect(await foo.text()).toEqual('this is content')
  })

  test('file-with-ct', async () => {
    const fd = new EdgeFormData()
    const file = new EdgeFile(['this is content', ' and some more'], 'foobar.txt', {type: 'text/plain'})
    fd.append('foo', file)

    const [boundary, body] = await formDataAsMultipart(fd)
    const fd2 = stringAsFormData(boundary, body)
    const foo = fd2.get('foo') as EdgeFile
    expect(foo).toBeInstanceOf(EdgeFile)
    expect(foo.name).toEqual('foobar.txt')
    expect(foo.type).toEqual('text/plain')
    expect(await foo.text()).toEqual('this is content and some more')
  })

  test('escaping', async () => {
    const fd = new EdgeFormData()
    fd.append('"foo"', 'apple\r\n"banana"\r\n\r\ncarrot\n\r\n')

    const [boundary, body] = await formDataAsMultipart(fd)

    const fd2 = stringAsFormData(boundary, body)

    expect(Object.fromEntries(fd2)).toStrictEqual({'"foo"': 'apple\r\n"banana"\r\n\r\ncarrot\n\r\n'})
  })

  test('no-boundary', async () => {
    expect(() => stringAsFormData('foobar', 'spam')).toThrow('boundary not found anywhere in body')
  })

  test('no-separator', async () => {
    const body = '--[boundary]\r\nContent-Disposition: form-data; name="foo";\r\nthis is body--[boundary]--\r\n'
    expect(() => stringAsFormData('[boundary]', body)).toThrow(
      'body is not well formed, no break found between headers and body',
    )
  })
})
