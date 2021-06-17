import {
  EdgeRequest,
  EdgeBlob,
  EdgeFile,
  EdgeFormData,
  EdgeResponse,
  EdgeFetchEvent,
  EdgeHeaders,
  EdgeReadableStream,
} from './models'
import stub_fetch from './stub_fetch'

export {
  EdgeRequest,
  EdgeBlob,
  EdgeFile,
  EdgeFormData,
  EdgeResponse,
  EdgeFetchEvent,
  EdgeHeaders,
  EdgeReadableStream,
  stub_fetch,
}
export {EdgeKVNamespace} from './kv_namespace'

declare const global: any

type FetchEventListener = (event: FetchEvent) => void

export class EdgeEnv {
  protected listener: FetchEventListener | null = null

  constructor() {
    this.addEventListener = this.addEventListener.bind(this)
    this.getListener = this.getListener.bind(this)
  }

  getListener(): FetchEventListener {
    if (this.listener) {
      return this.listener
    } else {
      throw new Error('FetchEvent listener not yet added via addEventListener')
    }
  }

  addEventListener(type: 'fetch', listener: FetchEventListener): void {
    if (type != 'fetch') {
      throw new Error(`only "fetch" events are supported, not "${type}"`)
    }
    this.listener = listener
  }

  dispatchEvent(event: FetchEvent): void {
    if (this.listener) {
      this.listener(event)
    } else {
      throw new Error('no event listener added')
    }
  }
}

const mock_types = {
  Request: EdgeRequest,
  Response: EdgeResponse,
  FetchEvent: EdgeFetchEvent,
  Headers: EdgeHeaders,
  Blob: EdgeBlob,
  File: EdgeFile,
  FormData: EdgeFormData,
  ReadableStream: EdgeReadableStream,
  fetch: stub_fetch,
}

export function makeEdgeEnv(extra: Record<string, any> = {}): EdgeEnv {
  const env = new EdgeEnv()
  Object.assign(global, mock_types, {addEventListener: env.addEventListener}, extra)
  return env
}
