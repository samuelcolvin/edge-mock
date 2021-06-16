export class EdgeReadableStream<R = string | Uint8Array | ArrayBuffer> implements ReadableStream {
  protected readonly _internals: StreamInternals<R>

  constructor(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>) {
    this._internals = new StreamInternals<R>(underlyingSource, strategy)
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
  protected readonly _buffer: ReadableStreamDefaultReadResult<R>[]
  protected readonly _controller: EdgeReadableStreamDefaultController<R>
  protected readonly _on_done_resolvers: Set<BasicCallback> = new Set()
  protected _open = false
  protected _error: any = null
  protected _locked = false
  protected _start_promise: any = null
  protected _highWaterMark: number

  constructor(source?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>) {
    this._source = source
    // TODO error on source.type
    this._highWaterMark = strategy?.highWaterMark || 10
    if (strategy?.size) {
      throw new Error('TODO call size')
    }
    this._buffer = []
    this._controller = new EdgeReadableStreamDefaultController<R>(this)
    if (this._source?.start) {
      this._start_promise = this._source?.start(this._controller)
    }
  }

  cancel(_reason?: string): Promise<void> {
    this._buffer.length = 0
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
    this._open = false
  }

  enqueue(chunk: R): void {
    this._buffer.push({done: false, value: chunk})
  }

  onError(e?: any): void {
    this._error = e || true
  }

  addResolver(resolver: BasicCallback): void {
    this._on_done_resolvers.add(resolver)
  }

  protected done(): ReadableStreamDefaultReadDoneResult {
    for (const resolve of this._on_done_resolvers) {
      resolve()
    }
    return {done: true, value: undefined}
  }

  async read(): Promise<ReadableStreamDefaultReadResult<R>> {
    if (!this._open) {
      return this.done()
    }
    if (this._start_promise) {
      await this._start_promise
      this._start_promise = null
    }
    const value = this._buffer.shift()
    if (value == undefined) {
      return this.done()
    } else {
      return value
    }
  }

  tee(): [ReadableStream<R>, ReadableStream<R>] {
    this.acquireLock()
    const source: UnderlyingSource<R> = {
      start: async (controller) => {
        if (this._start_promise) {
          await this._start_promise
          this._start_promise = null
        }
        for (const chunk of this._buffer) {
          const {done, value} = chunk
          if (!done) {
            controller.enqueue(value as R)
          }
        }
      },
      pull: controller => {
        if (this._source?.pull) {
          return this._source.pull(controller)
        }
      },
      cancel: controller => {
        if (this._source?.cancel) {
          return this._source.cancel(controller)
        }
      }
    }
    return [new EdgeReadableStream(source), new EdgeReadableStream(source)]
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
    this._internals.onError(e)
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
