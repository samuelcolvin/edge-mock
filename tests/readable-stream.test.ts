import {EdgeReadableStream} from '../src'
import {rsFromArray, rsToString} from '../src/utils'

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

  test('tee', async () => {
    const stream = rsFromArray(['foo', 'bar'])
    const [s1, s2] = stream.tee()
    expect(stream.locked).toBeTruthy()
    expect(s1.locked).toBeFalsy()
    expect(await rsToString(s1)).toEqual('foobar')
    expect(await rsToString(s2)).toEqual('foobar')
  })

  test('pipeThrough', async () => {
    expect(new EdgeReadableStream({}).pipeThrough).toThrow('pipeThrough not yet implemented')
  })

  test('pipeTo', async () => {
    expect(new EdgeReadableStream({}).pipeTo).toThrow('pipeTo not yet implemented')
  })
})
