import {EdgeReadableStream} from '../src'

describe('EdgeKVNamespace', () => {
  test('get_reader', async () => {
    const stream = new EdgeReadableStream(['foo', 'bar'])
    expect(stream.locked).toBeFalsy()
    const reader = stream.getReader()
    expect(stream.locked).toBeTruthy()
    expect(Object.getPrototypeOf(reader).constructor.name).toEqual('EdgeReadableStreamDefaultReader')

    let closed = false

    reader.closed.then(() => {
      closed = true
    })
    expect(closed).toBeFalsy()

    expect(await reader.read()).toStrictEqual({done: false, value: 'foo'})
    expect(await reader.read()).toStrictEqual({done: false, value: 'bar'})
    expect(closed).toBeFalsy()
    expect(await reader.read()).toStrictEqual({done: true, value: undefined})
    expect(closed).toBeTruthy()
  })

  test('get_reader-uint', async () => {
    const stream = new EdgeReadableStream([new Uint8Array([97, 98]), new Uint8Array([100, 101])])
    const reader = stream.getReader()

    expect(await reader.read()).toStrictEqual({done: false, value: new Uint8Array([97, 98])})
    expect(await reader.read()).toStrictEqual({done: false, value: new Uint8Array([100, 101])})
    expect(await reader.read()).toStrictEqual({done: true, value: undefined})
  })

  test('releaseLock', async () => {
    const stream = new EdgeReadableStream(['foo', 'bar'])
    expect(stream.locked).toBeFalsy()
    const reader = stream.getReader()
    expect(stream.locked).toBeTruthy()
    reader.releaseLock()
    expect(stream.locked).toBeFalsy()
  })

  test('get_reader-twice', async () => {
    const stream = new EdgeReadableStream(['foo', 'bar'])
    stream.getReader()
    expect(() => stream.getReader()).toThrow('ReadableStream already locked')
  })

  test('cancel', async () => {
    const stream = new EdgeReadableStream(['foo', 'bar'])
    const reader = stream.getReader()

    let cancelled = false
    reader.cancel('foobar').then(() => {
      cancelled = true
    })
    expect(cancelled).toBeFalsy()

    expect(await reader.read()).toStrictEqual({done: true, value: undefined})
    expect(cancelled).toBeTruthy()
  })

  test('no-implemented', async () => {
    const stream = new EdgeReadableStream(['foo', 'bar'])
    expect(stream.pipeThrough).toThrow('pipeThrough not yet implemented')
    expect(stream.pipeTo).toThrow('pipeTo not yet implemented')
    expect(stream.tee).toThrow('tee not yet implemented')
  })
})