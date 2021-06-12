import {decode} from '../utils'

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

  async read(): Promise<ReadableStreamDefaultReadValueResult<R>> {
    return (this.stream as any)._read()
  }

  async cancel(reason?: any): Promise<void> {
    return this.stream.cancel(reason)
  }

  releaseLock(): void {
    ;(this.stream as any)._unlock()
  }
}

export class EdgeReadableStream<R = string | Uint8Array> implements ReadableStream {
  protected _locked = false
  _internal_iterator: IterableIterator<R>
  protected readonly on_done_resolvers: Set<BasicCallback>

  constructor(chunks: R[]) {
    this._internal_iterator = chunks[Symbol.iterator]()
    this.on_done_resolvers = new Set()
  }

  get locked(): boolean {
    return this._locked
  }

  async cancel(_reason?: any): Promise<void> {
    this._internal_iterator = [][Symbol.iterator]()
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
    throw new Error('pipeThrough not et implemented')
  }

  pipeTo(_dest: WritableStream<R>, _options?: StreamPipeOptions): Promise<void> {
    throw new Error('pipeTo not et implemented')
  }

  tee(): [ReadableStream<R>, ReadableStream<R>] {
    throw new Error('pipeTo not et implemented')
  }

  protected _unlock(): void {
    this._locked = false
  }

  protected _add_resolver(resolver: BasicCallback): void {
    this.on_done_resolvers.add(resolver)
  }

  protected async _read(): Promise<ReadableStreamDefaultReadResult<R>> {
    const result = this._internal_iterator.next()
    if (result.done) {
      for (const resolve of this.on_done_resolvers) {
        resolve()
      }
      return result
    } else {
      return {done: false, value: result.value}
    }
  }
}

export async function readableStreamAsString(r: ReadableStream): Promise<string> {
  const reader = r.getReader()
  let s = ''
  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      return s
    } else {
      if (typeof value == 'string') {
        s += value
      } else {
        s += decode(value)
      }
    }
  }
}

export async function readableStreamAsBlobParts(r: ReadableStream): Promise<BlobPart[]> {
  const reader = r.getReader()
  const parts: BlobPart[] = []
  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      return parts
    } else {
      parts.push(value)
    }
  }
}
