import {EdgeRequest, EdgeBlob, EdgeResponse, EdgeFetchEvent, EdgeHeaders, EdgeReadableStream} from './models'
export {MockKVNamespace} from './kv_namespace'
import {stub_edge_fetch} from './fetch'

export {EdgeRequest, EdgeBlob, EdgeResponse, EdgeFetchEvent, EdgeHeaders, EdgeReadableStream, stub_edge_fetch}

declare const global: any

interface FetchEventListener {
  (evt: FetchEvent): void
}

export class EdgeEnv {
  protected readonly listeners: Set<FetchEventListener>

  constructor() {
    this.listeners = new Set()
    this.addEventListener = this.addEventListener.bind(this)
  }

  addEventListener(type: 'fetch', listener: FetchEventListener): void {
    if (type != 'fetch') {
      throw new Error(`only "fetch" events are supported, not "${type}"`)
    }
    this.listeners.add(listener)
  }

  dispatchEvent(event: FetchEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  resetEventListeners(): void {
    this.listeners.clear()
  }
}

const mock_types = {
  Request: EdgeRequest,
  Response: EdgeResponse,
  FetchEvent: EdgeFetchEvent,
  Headers: EdgeHeaders,
  Blob: EdgeBlob,
  ReadableStream: EdgeReadableStream,
  fetch: stub_edge_fetch,
}

export function makeEdgeEnv(extra: Record<string, any> = {}): EdgeEnv {
  const env = new EdgeEnv()
  Object.assign(global, mock_types, {addEventListener: env.addEventListener}, extra)
  return env
}
