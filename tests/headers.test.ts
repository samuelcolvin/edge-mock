import {EdgeHeaders} from '../src'

describe('EdgeBlob', () => {
  test('object', async () => {
    const headers = new EdgeHeaders({Foo: 'bar', apple: 'Banana'})
    expect(headers.get('Foo')).toEqual('bar')
    expect(headers.get('foo')).toEqual('bar')
    expect(headers.get('FOO')).toEqual('bar')
    expect([...headers.keys()]).toEqual(['foo', 'apple'])
    expect([...headers.values()]).toEqual(['bar', 'Banana'])
    expect([...headers.entries()]).toEqual([
      ['foo', 'bar'],
      ['apple', 'Banana'],
    ])
    expect([...headers]).toEqual([
      ['foo', 'bar'],
      ['apple', 'Banana'],
    ])
    expect(headers.has('FOO')).toBeTruthy()
    expect(headers.has('other')).toBeFalsy()
  })

  test('map', async () => {
    const m = new Map([
      ['foo', 'bar'],
      ['APPLE', 'Banana'],
    ])
    const headers = new EdgeHeaders(m)
    expect([...headers]).toEqual([
      ['foo', 'bar'],
      ['apple', 'Banana'],
    ])
  })

  test('other-headers', async () => {
    const headers1 = new EdgeHeaders({Foo: 'bar', apple: 'Banana'})
    const headers = new EdgeHeaders(headers1)
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar', apple: 'Banana'})
    headers.delete('foo')
    expect(Object.fromEntries(headers)).toEqual({apple: 'Banana'})
    expect(Object.fromEntries(headers1)).toEqual({foo: 'bar', apple: 'Banana'})
  })

  test('array', async () => {
    const headers = new EdgeHeaders([
      ['Foo', 'bar'],
      ['apple', 'Banana'],
    ])
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar', apple: 'Banana'})
  })

  test('append', async () => {
    const headers = new EdgeHeaders({Foo: 'bar', apple: 'Banana'})
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar', apple: 'Banana'})
    headers.append('Spam', 'HAM')
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar', apple: 'Banana', spam: 'HAM'})
    headers.append('FOO', 'More')
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar,More', apple: 'Banana', spam: 'HAM'})
  })

  test('delete', async () => {
    const headers = new EdgeHeaders({Foo: 'bar', apple: 'Banana'})
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar', apple: 'Banana'})
    headers.delete('Foo')
    expect(Object.fromEntries(headers)).toEqual({apple: 'Banana'})
    headers.delete('sniffle')
    expect(Object.fromEntries(headers)).toEqual({apple: 'Banana'})
  })

  test('set', async () => {
    const headers = new EdgeHeaders({Foo: 'bar', apple: 'Banana'})
    expect(Object.fromEntries(headers)).toEqual({foo: 'bar', apple: 'Banana'})
    headers.set('Foo', 'changed')
    expect(Object.fromEntries(headers)).toEqual({foo: 'changed', apple: 'Banana'})
    headers.set('Sniffle', 'new-value')
    expect(Object.fromEntries(headers)).toEqual({foo: 'changed', apple: 'Banana', sniffle: 'new-value'})
  })

  test('forEach', async () => {
    const headers = new EdgeHeaders({Foo: 'bar', apple: 'Banana'})
    const each_items: any[] = []
    headers.forEach((value, key, parent) => {
      each_items.push({value, key, parent})
    })
    expect(each_items).toStrictEqual([
      {value: 'bar', key: 'foo', parent: headers},
      {value: 'Banana', key: 'apple', parent: headers},
    ])
  })
})
