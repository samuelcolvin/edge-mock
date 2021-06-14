import {catUint8Arrays, decode, encode} from '../utils'

export class EdgeReadableStream<R = string | Uint8Array> implements ReadableStream {
  protected _locked = false
  protected internal_iterator: IterableIterator<R>
  protected readonly on_done_resolvers: Set<BasicCallback>

  constructor(chunks: R[]) {
    this.internal_iterator = chunks[Symbol.iterator]()
    this.on_done_resolvers = new Set()
  }

  get locked(): boolean {
    return this._locked
  }

  cancel(_reason?: string): Promise<void> {
    this.internal_iterator = [][Symbol.iterator]()
    return new Promise(resolve => {
      this.on_done_resolvers.add(resolve)
    })
  }

  getReader({mode}: {mode?: 'byob'} = {}): ReadableStreamDefaultReader<R> {
    if (mode) {
      throw new TypeError('ReadableStream modes other than default are not supported')
    } else if (this._locked) {
      throw new Error('ReadableStream already locked')
    }
    this._locked = true
    return new EdgeReadableStreamDefaultReader(this)
  }

  pipeThrough<T>(_transform: ReadableWritablePair<T, R>, _options?: StreamPipeOptions): ReadableStream<T> {
    throw new Error('pipeThrough not yet implemented')
  }

  pipeTo(_dest: WritableStream<R>, _options?: StreamPipeOptions): Promise<void> {
    throw new Error('pipeTo not yet implemented')
  }

  tee(): [ReadableStream<R>, ReadableStream<R>] {
    throw new Error('tee not yet implemented')
  }

  protected _unlock(): void {
    this._locked = false
  }

  protected _add_resolver(resolver: BasicCallback): void {
    this.on_done_resolvers.add(resolver)
  }

  _read_sync(): ReadableStreamDefaultReadResult<R> {
    const {done, value} = this.internal_iterator.next()
    if (done) {
      for (const resolve of this.on_done_resolvers) {
        resolve()
      }
      return {done: true, value: undefined}
    } else {
      return {done: false, value}
    }
  }

  async _toString(): Promise<string> {
    const reader = this.getReader()
    let s = ''
    while (true) {
      const {done, value} = await reader.read()
      if (done) {
        return s
      } else {
        if (typeof value == 'string') {
          s += value
        } else {
          s += decode(value as any)
        }
      }
    }
  }

  async _toBlobParts(): Promise<BlobPart[]> {
    const reader = this.getReader()
    const parts: BlobPart[] = []
    while (true) {
      const {done, value} = await reader.read()
      if (done) {
        return parts
      } else {
        parts.push(value as any)
      }
    }
  }

  _toArrayBuffer(): ArrayBuffer {
    const chunks: Uint8Array[] = []
    while (true) {
      const {done, value} = this._read_sync()
      if (done) {
        return catUint8Arrays(chunks).buffer
      } else {
        if (typeof value == 'string') {
          chunks.push(encode(value))
        } else {
          chunks.push(value as any)
        }
      }
    }
  }
}

type BasicCallback = () => void

class EdgeReadableStreamDefaultReader<R> implements ReadableStreamDefaultReader {
  protected readonly stream: EdgeReadableStream<R>
  protected readonly closed_promise: Promise<undefined>

  constructor(stream: EdgeReadableStream<R>) {
    this.stream = stream
    this.closed_promise = new Promise(resolve => {
      ;(stream as any)._add_resolver(() => resolve(undefined))
    })
  }

  get closed(): Promise<undefined> {
    return this.closed_promise
  }

  async read(): Promise<ReadableStreamDefaultReadResult<R>> {
    return this.stream._read_sync()
  }

  cancel(reason?: any): Promise<void> {
    return this.stream.cancel(reason)
  }

  releaseLock(): void {
    const stream = this.stream as any
    stream._unlock()
  }
}
