export class EdgeReadableStream implements ReadableStream {
  protected readonly _internals: StreamInternals

  constructor(underlyingSource?: UnderlyingSource, strategy?: QueuingStrategy) {
    this._internals = new StreamInternals(underlyingSource, strategy || {})
  }

  get locked(): boolean {
    return this._internals.locked
  }

  cancel(reason?: string): Promise<void> {
    return this._internals.cancel(reason)
  }

  getReader(options: ReadableStreamGetReaderOptions): ReadableStreamBYOBReader
  getReader(): ReadableStreamDefaultReader
  getReader(options?: ReadableStreamGetReaderOptions): ReadableStreamBYOBReader | ReadableStreamDefaultReader {
    if (options) {
      throw new TypeError('ReadableStream modes other than default are not supported')
    }
    this._internals.acquireLock()
    return new EdgeReadableStreamDefaultReader(this._internals)
  }

  pipeThrough<T>(transform: ReadableStreamTransform, options?: StreamPipeOptions): ReadableStream {
    throw new Error('pipeThrough not yet implemented')
  }

  pipeTo(_dest: WritableStream, _options?: StreamPipeOptions): Promise<void> {
    throw new Error('pipeTo not yet implemented')
  }

  tee(): [ReadableStream, ReadableStream] {
    return this._internals.tee()
  }

  values(options?: ReadableStreamValuesOptions): AsyncIterableIterator<ReadableStreamReadResult> {
    return 'TODO' as any
  }

  [Symbol.asyncIterator](options?: ReadableStreamValuesOptions): AsyncIterableIterator<ReadableStreamReadResult> {
    return 'TODO' as any
  }
}

class StreamInternals {
  protected readonly _source?: UnderlyingSource
  protected readonly _chunks: ChunkType[]
  protected readonly _controller: EdgeReadableStreamDefaultController
  protected readonly _on_done_resolvers: Set<BasicCallback> = new Set()
  protected _closed = false
  protected _done = false
  protected _error: any = null
  protected _locked = false
  protected _start_promise: any = null
  protected _highWaterMark: number

  constructor(source?: UnderlyingSource, {highWaterMark, size}: QueuingStrategy = {}) {
    this._source = source
    if (source?.type) {
      throw new Error('UnderlyingSource.type is not yet supported')
    }
    this._highWaterMark = highWaterMark || 10
    if (size) {
      throw new Error('TODO call size')
    }
    this._chunks = []
    this._controller = new EdgeReadableStreamDefaultController(this)
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

  enqueue(chunk: ChunkType): void {
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

  async read(): Promise<ReadableStreamDefaultReadResult> {
    if (this._done) {
      return {done: true, value: undefined}
    }
    if (this._start_promise) {
      await this._start_promise
      this._start_promise = null
    }
    if (!this._closed && this._chunks.length < this._highWaterMark && this._source?.pull) {
      if (this._error) {
        throw this._error
      } else {
        await Promise.resolve(this._source.pull(this._controller))
      }
    }
    const value = this._chunks.shift()
    if (value == undefined) {
      return this.done()
    } else {
      return {done: false, value}
    }
  }

  tee(): [ReadableStream, ReadableStream] {
    this.acquireLock()
    const chunks1: ChunkType[] = [...this._chunks]
    const chunks2: ChunkType[] = [...this._chunks]
    const start = async () => {
      const p = this._start_promise
      if (p) {
        this._start_promise = null
        await p
      }
    }
    const pull = async (controller: ReadableStreamController, which: 1 | 2): Promise<void> => {
      const {value} = await this.read()
      if (value) {
        chunks1.push(value)
        chunks2.push(value)
      }
      const chunks = which == 1 ? chunks1 : chunks2
      const next = chunks.shift()
      if (next == undefined) {
        controller.close()
      } else {
        controller.enqueue(next)
      }
    }
    const cancel = async (controller: ReadableStreamController): Promise<void> => {
      this.cancel()
      const c = this._source?.cancel
      if (c) {
        delete this._source?.cancel
        await c(controller)
      }
    }

    const source1: UnderlyingSource = {
      start: () => start(),
      pull: controller => pull(controller, 1),
      cancel: controller => cancel(controller),
    }
    const source2: UnderlyingSource = {
      start: () => start(),
      pull: controller => pull(controller, 2),
      cancel: controller => cancel(controller),
    }
    return [new EdgeReadableStream(source1), new EdgeReadableStream(source2)]
  }
}

class EdgeReadableStreamDefaultController implements ReadableStreamDefaultController {
  readonly desiredSize: number | null = null
  protected readonly _internals: StreamInternals

  constructor(internals: StreamInternals) {
    this._internals = internals
  }

  close(): void {
    this._internals.close()
  }

  enqueue(chunk: ChunkType): void {
    this._internals.enqueue(chunk)
  }

  error(e?: any): void {
    this._internals.error(e)
  }
}

type BasicCallback = () => void

class EdgeReadableStreamDefaultReader implements ReadableStreamDefaultReader {
  protected readonly _internals: StreamInternals
  protected readonly _closed_promise: Promise<undefined>

  constructor(internals: StreamInternals) {
    this._internals = internals
    this._closed_promise = new Promise(resolve => {
      internals.addResolver(() => resolve(undefined))
    })
  }

  get closed(): Promise<undefined> {
    return this._closed_promise
  }

  async read(): Promise<ReadableStreamReadResult> {
    return this._internals.read()
  }

  cancel(reason?: any): Promise<void> {
    return this._internals.cancel(reason)
  }

  releaseLock(): void {
    this._internals.releaseLock()
  }
}

type ChunkType = string | Uint8Array | ArrayBuffer | ArrayBufferView

interface UnderlyingSourceCancelCallback {
  (reason: any): void | PromiseLike<void>
}

interface ReadableStreamController {
  readonly desiredSize: number | null
  close(): void
  enqueue(chunk: ChunkType): void
  error(e?: any): void
}

interface UnderlyingSourcePullCallback {
  (controller: ReadableStreamController): void | PromiseLike<void>
}

interface UnderlyingSourceStartCallback {
  (controller: ReadableStreamController): void | PromiseLike<void>
}

interface UnderlyingSource {
  cancel?: UnderlyingSourceCancelCallback
  pull?: UnderlyingSourcePullCallback
  start?: UnderlyingSourceStartCallback
  type?: undefined
}

interface QueuingStrategySize {
  (chunk: ChunkType): number
}

interface QueuingStrategy {
  highWaterMark?: number
  size?: QueuingStrategySize
}

interface ReadableStreamTransform {
  writable: WritableStream
  readable: ReadableStream
}

interface ReadableStreamDefaultReadDoneResult {
  done: true
  value?: undefined
}

interface ReadableStreamDefaultReadValueResult {
  done: false
  value: ChunkType
}
type ReadableStreamDefaultReadResult = ReadableStreamDefaultReadValueResult | ReadableStreamDefaultReadDoneResult
