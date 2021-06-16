export class EdgeReadableStream<R = string | Uint8Array | ArrayBuffer> implements ReadableStream {
  protected readonly _internals: StreamInternals<R>

  constructor(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>) {
    this._internals = new StreamInternals<R>(underlyingSource, strategy || {})
  }

  get locked(): boolean {
    return this._internals.locked
  }

  cancel(reason?: string): Promise<void> {
    return this._internals.cancel(reason)
  }

  getReader({mode}: {mode?: 'byob'} = {}): ReadableStreamDefaultReader<R> {
    if (mode) {
      throw new TypeError('ReadableStream modes other than default are not supported')
    }
    this._internals.acquireLock()
    return new EdgeReadableStreamDefaultReader(this._internals)
  }

  pipeThrough<T>(_transform: ReadableWritablePair<T, R>, _options?: StreamPipeOptions): ReadableStream<T> {
    throw new Error('pipeThrough not yet implemented')
  }

  pipeTo(_dest: WritableStream<R>, _options?: StreamPipeOptions): Promise<void> {
    throw new Error('pipeTo not yet implemented')
  }

  tee(): [ReadableStream<R>, ReadableStream<R>] {
    return this._internals.tee()
  }
}

class StreamInternals<R> {
  protected readonly _source?: UnderlyingSource<R>
  protected readonly _chunks: R[]
  protected readonly _controller: EdgeReadableStreamDefaultController<R>
  protected readonly _on_done_resolvers: Set<BasicCallback> = new Set()
  protected _closed = false
  protected _done = false
  protected _error: any = null
  protected _locked = false
  protected _start_promise: any = null
  protected _highWaterMark: number

  constructor(source?: UnderlyingSource<R>, {highWaterMark, size}: QueuingStrategy<R> = {}) {
    this._source = source
    if (source?.type) {
      throw new Error('UnderlyingSource.type is not yet supported')
    }
    this._highWaterMark = highWaterMark || 10
    if (size) {
      throw new Error('TODO call size')
    }
    this._chunks = []
    this._controller = new EdgeReadableStreamDefaultController<R>(this)
    if (this._source?.start) {
      this._start_promise = this._source.start(this._controller)
    }
  }

  cancel(_reason?: string): Promise<void> {
    this._chunks.length = 0
    this._closed = true
    if (this._source?.cancel) {
      this._source?.cancel(this._controller)
    }

    return new Promise(resolve => {
      this.addResolver(resolve)
    })
  }

  get locked(): boolean {
    return this._locked
  }

  acquireLock(): void {
    if (this._locked) {
      throw new Error('ReadableStream already locked')
    }
    this._locked = true
  }

  releaseLock(): void {
    this._locked = false
  }

  close(): void {
    this._closed = true
  }

  enqueue(chunk: R): void {
    this._chunks.push(chunk)
  }

  error(e?: any): void {
    this._error = e || true
  }

  addResolver(resolver: BasicCallback): void {
    this._on_done_resolvers.add(resolver)
  }

  protected done(): ReadableStreamDefaultReadDoneResult {
    for (const resolve of this._on_done_resolvers) {
      resolve()
    }
    this._done = true
    return {done: true, value: undefined}
  }

  async read(): Promise<ReadableStreamDefaultReadResult<R>> {
    if (this._done) {
      // Error or done value?
      throw new Error('stream done, should be this be a done value?')
    }
    if (this._start_promise) {
      await this._start_promise
      this._start_promise = null
    }
    if (!this._closed && this._chunks.length < this._highWaterMark && this._source?.pull) {
      await Promise.resolve(this._source.pull(this._controller))
    }
    const value = this._chunks.shift()
    if (value == undefined) {
      return this.done()
    } else {
      return {done: false, value}
    }
  }

  tee(): [ReadableStream<R>, ReadableStream<R>] {
    this.acquireLock()
    if (this._chunks.length) {
      throw new Error('ReadableStream already started, tee() not available')
    }
    const chunks2: R[] = []
    const lock = new AsyncLock()

    const source1: UnderlyingSource<R> = {
      start: async () => {
        if (this._start_promise) {
          await this._start_promise
          this._start_promise = null
        }
      },
      pull: async controller => {
        const {value, done} = await this.read()
        if (done) {
          controller.close()
        } else {
          chunks2.push(value as any)
          controller.enqueue(value as any)
        }
        lock.release(done)
      },
      cancel: controller => {
        if (this._source?.cancel) {
          return this._source.cancel(controller)
        }
      },
    }
    const source2: UnderlyingSource<R> = {
      pull: async controller => {
        await lock.wait()
        const value = chunks2.shift()
        if (value == undefined) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
      cancel: controller => {
        if (this._source?.cancel) {
          return this._source.cancel(controller)
        }
      },
    }
    return [new EdgeReadableStream(source1), new EdgeReadableStream(source2)]
  }
}

class EdgeReadableStreamDefaultController<R> implements ReadableStreamDefaultController {
  readonly desiredSize: number | null = null
  protected readonly _internals: StreamInternals<R>

  constructor(internals: StreamInternals<R>) {
    this._internals = internals
  }

  close(): void {
    this._internals.close()
  }

  enqueue(chunk: R): void {
    this._internals.enqueue(chunk)
  }

  error(e?: any): void {
    this._internals.error(e)
  }
}

type BasicCallback = () => void

class EdgeReadableStreamDefaultReader<R> implements ReadableStreamDefaultReader {
  protected readonly _internals: StreamInternals<R>
  protected readonly _closed_promise: Promise<undefined>

  constructor(internals: StreamInternals<R>) {
    this._internals = internals
    this._closed_promise = new Promise(resolve => {
      internals.addResolver(() => resolve(undefined))
    })
  }

  get closed(): Promise<undefined> {
    return this._closed_promise
  }

  async read(): Promise<ReadableStreamDefaultReadResult<R>> {
    return this._internals.read()
  }

  cancel(reason?: any): Promise<void> {
    return this._internals.cancel(reason)
  }

  releaseLock(): void {
    this._internals.releaseLock()
  }
}

class AsyncLock {
  protected resolve: () => void = () => undefined
  protected promise: Promise<void>
  protected waiting = 0
  protected finished = false

  constructor() {
    this.promise = new Promise(resolve => {
      this.resolve = resolve
    })
  }

  release(finished: boolean): void {
    this.finished = this.finished || finished
    if (this.waiting > 0) {
      this.resolve()
      this.promise = new Promise(resolve => {
        this.resolve = resolve
      })
    }
  }

  async wait(): Promise<void> {
    if (!this.finished) {
      this.waiting++
      await this.promise
      this.waiting--
    }
  }
}
