import {EdgeReadableStream} from '../src'
import {rsFromArray, rsToArrayBufferView, rsToString} from '../src/utils'

describe('EdgeKVNamespace', () => {
  test('basic-string', async () => {
    const iterator = ['foo', 'bar'][Symbol.iterator]()
    const stream = new EdgeReadableStream({
      async pull(controller) {
        const {value, done} = await iterator.next()

        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
    })

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
    const stream = rsFromArray([new Uint8Array([97, 98]), new Uint8Array([100, 101])])
    expect(stream).toBeInstanceOf(EdgeReadableStream)
    const reader = stream.getReader()

    expect(await reader.read()).toStrictEqual({done: false, value: new Uint8Array([97, 98])})
    expect(await reader.read()).toStrictEqual({done: false, value: new Uint8Array([100, 101])})
    expect(await reader.read()).toStrictEqual({done: true, value: undefined})
  })

  test('releaseLock', async () => {
    const stream = new EdgeReadableStream({})
    expect(stream.locked).toBeFalsy()
    const reader = stream.getReader()
    expect(stream.locked).toBeTruthy()
    reader.releaseLock()
    expect(stream.locked).toBeFalsy()
  })

  test('get_reader-twice', async () => {
    const stream = new EdgeReadableStream({})
    stream.getReader()
    expect(() => stream.getReader()).toThrow('ReadableStream already locked')
  })

  test('cancel', async () => {
    const stream = rsFromArray(['foo', 'bar'])
    const reader = stream.getReader()

    let cancelled = false
    reader.cancel('foobar').then(() => {
      cancelled = true
    })
    expect(cancelled).toBeFalsy()

    expect(await reader.read()).toStrictEqual({done: true, value: undefined})
    expect(cancelled).toBeTruthy()
  })

  test('ArrayBuffer', async () => {
    const stream = rsFromArray([new Uint8Array([100, 101]), new Uint8Array([102, 103])])
    expect(await rsToArrayBufferView(stream)).toEqual(new Uint8Array([100, 101, 102, 103]))
  })

  test('wrong-type', async () => {
    const stream = rsFromArray([new Date()])
    await expect(rsToArrayBufferView(stream)).rejects.toThrow(
      'Unexpected type "Date", expected string, ArrayBuffer or Uint8Array',
    )
  })

  test('tee', async () => {
    const stream = rsFromArray(['foo', 'bar'])
    const [s1, s2] = stream.tee()
    expect(stream.locked).toBeTruthy()
    expect(s1.locked).toBeFalsy()
    expect(await rsToString(s1)).toEqual('foobar')
    expect(await rsToString(s2)).toEqual('foobar')
  })

  test('tee-reverse', async () => {
    const stream = rsFromArray(['foo', 'bar'])
    const [s1, s2] = stream.tee()
    expect(await rsToString(s2)).toEqual('foobar')
    expect(await rsToString(s1)).toEqual('foobar')
  })

  test('tee-cancel', async () => {
    const iterator = ['foo', 'bar', 'spam'][Symbol.iterator]()
    let cancelled = false
    const stream = new EdgeReadableStream({
      async pull(controller) {
        const {value, done} = await iterator.next()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
      cancel() {
        cancelled = true
      },
    })

    const [s1, s2] = stream.tee()
    const r1 = s1.getReader()
    expect(await r1.read()).toStrictEqual({done: false, value: 'foo'})
    expect(cancelled).toBeFalsy()
    const cancel_promise = r1.cancel()
    expect(await r1.read()).toStrictEqual({done: true, value: undefined})
    expect(cancelled).toBeTruthy()
    expect(await cancel_promise).toBeUndefined()
    const r2 = s2.getReader()
    expect(await r2.read()).toStrictEqual({done: false, value: 'foo'})
    expect(await r2.read()).toStrictEqual({done: true, value: undefined})
  })

  test('controller-cancel', async () => {
    const iterator = ['foo', 'bar', 'spam'][Symbol.iterator]()
    const stream = new EdgeReadableStream({
      async pull(controller) {
        const {value, done} = await iterator.next()

        if (done) {
          controller.close()
        } else {
          if (value == 'bar') {
            controller.error(new Error('this is an error'))
          }
          controller.enqueue(value)
        }
      },
    })

    const reader = stream.getReader()

    await expect(reader.read()).resolves.toStrictEqual({done: false, value: 'foo'})
    await expect(reader.read()).resolves.toStrictEqual({done: false, value: 'bar'})
    await expect(reader.read()).rejects.toThrow('this is an error')
  })

  test('source-type', async () => {
    const s = {type: 'bytes'} as any
    expect(() => new EdgeReadableStream(s)).toThrow('UnderlyingSource.type is not yet supported')
  })

  test('reader-type', async () => {
    const stream = new EdgeReadableStream()
    expect(() => stream.getReader({mode: 'byob'})).toThrow('ReadableStream modes other than default are not supported')
  })

  test('pipeThrough', async () => {
    expect(new EdgeReadableStream({}).pipeThrough).toThrow('pipeThrough not yet implemented')
  })

  test('pipeTo', async () => {
    expect(new EdgeReadableStream({}).pipeTo).toThrow('pipeTo not yet implemented')
  })
})
