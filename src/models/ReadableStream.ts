export class EdgeReadableStream<R = string | Uint8Array | ArrayBuffer> implements ReadableStream {
  protected _locked = false
  protected _iterator: IterableIterator<R>
  protected readonly _on_done_resolvers: Set<BasicCallback>

  constructor(chunks: R[]) {
    this._iterator = chunks[Symbol.iterator]()
    this._on_done_resolvers = new Set()
  }

  get locked(): boolean {
    return this._locked
  }

  cancel(_reason?: string): Promise<void> {
    this._iterator = [][Symbol.iterator]()
    return new Promise(resolve => {
      this._on_done_resolvers.add(resolve)
    })
  }

  getReader({mode}: {mode?: 'byob'} = {}): ReadableStreamDefaultReader<R> {
    if (mode) {
      throw new TypeError('ReadableStream modes other than default are not supported')
    }
    this._lock()
    return new EdgeReadableStreamDefaultReader(this, resolver => this._add_resolver(resolver))
  }

  pipeThrough<T>(_transform: ReadableWritablePair<T, R>, _options?: StreamPipeOptions): ReadableStream<T> {
    throw new Error('pipeThrough not yet implemented')
  }

  pipeTo(_dest: WritableStream<R>, _options?: StreamPipeOptions): Promise<void> {
    throw new Error('pipeTo not yet implemented')
  }

  tee(): [ReadableStream<R>, ReadableStream<R>] {
    this._lock()
    const chunks = [...this._iterator]
    this._iterator = [][Symbol.iterator]()
    return [new EdgeReadableStream(chunks), new EdgeReadableStream(chunks)]
  }

  protected _unlock(): void {
    this._locked = false
  }

  protected _add_resolver(resolver: BasicCallback): void {
    this._on_done_resolvers.add(resolver)
  }

  protected _lock(): void {
    if (this._locked) {
      throw new Error('ReadableStream already locked')
    }
    this._locked = true
  }

  _syncRead(): ReadableStreamDefaultReadResult<R> {
    const {done, value} = this._iterator.next()
    if (done) {
      for (const resolve of this._on_done_resolvers) {
        resolve()
      }
      return {done: true, value: undefined}
    } else {
      return {done: false, value}
    }
  }
}

type BasicCallback = () => void

class EdgeReadableStreamDefaultReader<R> implements ReadableStreamDefaultReader {
  protected readonly stream: EdgeReadableStream<R>
  protected readonly closed_promise: Promise<undefined>

  constructor(stream: EdgeReadableStream<R>, add_resolver: (resolver: BasicCallback) => void) {
    this.stream = stream
    this.closed_promise = new Promise(resolve => {
      add_resolver(() => resolve(undefined))
    })
  }

  get closed(): Promise<undefined> {
    return this.closed_promise
  }

  async read(): Promise<ReadableStreamDefaultReadResult<R>> {
    return this.stream._syncRead()
  }

  cancel(reason?: any): Promise<void> {
    return this.stream.cancel(reason)
  }

  releaseLock(): void {
    const stream = this.stream as any
    stream._unlock()
  }
}
