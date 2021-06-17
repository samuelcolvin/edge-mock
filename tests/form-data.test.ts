import {EdgeFormData, EdgeFile} from '../src'

describe('EdgeFormData', () => {
  test('as-multipart-one', async () => {
    const fd = new EdgeFormData()
    fd.append('foo', 'bar')

    const mpf = await fd._asMultipart('(boundary)')
    expect(mpf).toEqual('(boundary)\r\nContent-Disposition: form-data; name="foo"\r\n\r\nbar\r\n(boundary)--\r\n')
  })

  test('as-multipart-one', async () => {
    const fd = new EdgeFormData()
    const file = new EdgeFile(['this is content'], 'foobar.txt')
    fd.append('foo', file)

    const mpf = await fd._asMultipart('(boundary)')
    expect(mpf).toEqual(
      '(boundary)\r\n' +
        'Content-Disposition: form-data; name="foo" filename="foobar.txt"\r\n' +
        'Content-Type: application/octet-stream\r\n' +
        '\r\n' +
        'this is content\r\n' +
        '(boundary)--\r\n',
    )
  })
})
