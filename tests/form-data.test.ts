import {EdgeFormData, EdgeFile, EdgeBlob} from '../src'
import {formDataAsMultipart} from '../src/models/FormData'

describe('EdgeFormData', () => {
  test('as-multipart-one', async () => {
    const fd = new EdgeFormData()
    fd.append('foo', 'bar')

    const [boundary, data] = await formDataAsMultipart(fd)
    expect(boundary).toMatch(/^[a-z0-9]{32}$/)
    expect(data).toEqual(
      `--${boundary}\r\nContent-Disposition: form-data; name="foo"\r\n\r\nbar\r\n--${boundary}--\r\n`,
    )
  })

  test('as-multipart-one', async () => {
    const fd = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foobar.txt')
    fd.append('foo', file)

    const [boundary, data] = await formDataAsMultipart(fd)
    expect(data).toEqual(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="foo"; filename="foobar.txt"\r\n` +
        `Content-Type: application/octet-stream\r\n` +
        `\r\n` +
        `this is content\r\n` +
        `--${boundary}--\r\n`,
    )
  })

  test('append', async () => {
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

  test('delete', async () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    fd.append('a', '2')
    fd.append('b', '3')
    fd.delete('a')
    expect([...fd]).toStrictEqual([['b', '3']])
  })

  test('get', async () => {
    const fd = new EdgeFormData()
    fd.append('a', '1')
    expect(fd.get('a')).toEqual('1')
    fd.append('a', '2')
    expect(fd.get('a')).toEqual('1')
    expect(fd.get('b')).toBeNull()
  })

  test('getAll', async () => {
    const fd = new EdgeFormData()
    expect(fd.getAll('a')).toStrictEqual([])
    fd.append('a', '1')
    expect(fd.getAll('a')).toStrictEqual(['1'])
    fd.append('a', '2')
    expect(fd.getAll('a')).toStrictEqual(['1', '2'])
  })

  test('has', async () => {
    const fd = new EdgeFormData()
    expect(fd.has('a')).toStrictEqual(false)
    fd.append('a', '1')
    expect(fd.has('a')).toStrictEqual(true)
    fd.append('a', '2')
    expect(fd.has('a')).toStrictEqual(true)
  })

  test('set', async () => {
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

  test('set-order', async () => {
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
})
