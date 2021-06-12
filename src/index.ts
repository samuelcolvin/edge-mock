import {
  EdgeRequest,
  EdgeBlob,
  EdgeResponse,
  EdgeFetchEvent,
  EdgeHeaders,
  EdgeEventTarget,
  EdgeReadableStream,
} from './models'
export {MockKVNamespace} from './kv_namespace'
import {stub_edge_fetch} from './fetch'

export {
  EdgeRequest,
  EdgeBlob,
  EdgeResponse,
  EdgeFetchEvent,
  EdgeHeaders,
  EdgeEventTarget,
  EdgeReadableStream,
  stub_edge_fetch,
}

declare const global: any

export class EdgeEnv extends EdgeEventTarget {
  readonly EdgeRequest = EdgeRequest
  readonly EdgeResponse = EdgeResponse
  readonly EdgeFetchEvent = EdgeFetchEvent
  readonly EdgeHeaders = EdgeHeaders
  readonly EdgeBlob = EdgeBlob
  readonly EdgeReadableStream = EdgeReadableStream
  readonly stub_edge_fetch = stub_edge_fetch
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
  Object.assign(global, mock_types, extra)
  return new EdgeEnv()
}
