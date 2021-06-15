// https://developers.cloudflare.com/workers/runtime-apis/kv
// TODO expiration
import fs from 'fs'
import path from 'path'
import {encode, decode, escape_regex, syncRsToArrayBuffer} from './utils'
import {EdgeReadableStream} from './models'

type InputValueValue = string | ArrayBuffer | ReadableStream | Buffer
interface InputObject {
  value: InputValueValue
  metadata?: Record<string, string>
  expiration?: number
}
type InputValue = InputValueValue | InputObject

interface InternalValue {
  value: ArrayBuffer
  metadata?: unknown
  expiration?: number
}

interface OutputValue {
  value: any
  metadata: unknown | null
}

interface ListValue {
  name: string
  expiration?: number
  metadata?: unknown
}

type ValueTypeNames = 'text' | 'json' | 'arrayBuffer' | 'stream'

export class EdgeKVNamespace implements KVNamespace {
  protected kv: Map<string, InternalValue>

  constructor(kv: Record<string, InputValue> = {}) {
    this.kv = new Map()
    this._put_many(kv)
  }

  async get(key: string, options?: {type?: ValueTypeNames; cacheTtl?: number} | ValueTypeNames): Promise<any> {
    options = options || {}
    if (typeof options == 'string') {
      options = {type: options}
    }
    const v = await this.getWithMetadata(key, options.type)
    return v.value || null
  }

  async getWithMetadata(key: string, type?: ValueTypeNames): Promise<OutputValue> {
    const v = this.kv.get(key)
    if (v == undefined) {
      return {value: null, metadata: null}
    }
    return {value: prepare_value(v.value, type), metadata: v.metadata || {}}
  }

  async put(key: string, value: InputValueValue, extra: {metadata?: Record<string, string>} = {}): Promise<void> {
    this._put(key, value, extra.metadata)
  }

  async delete(key: string): Promise<void> {
    this.kv.delete(key)
  }

  async list(options?: {prefix?: string; limit?: number; cursor?: string}): Promise<{
    keys: ListValue[]
    list_complete: boolean
    cursor?: string
  }> {
    options = options || {}
    if (options.cursor) {
      throw new Error('list cursors not yet implemented')
    }

    const prefix = options.prefix
    const limit = options.limit || 1000
    const keys: ListValue[] = []
    for (const [name, value] of this.kv) {
      if (!prefix || name.startsWith(prefix)) {
        if (keys.length == limit) {
          return {keys, list_complete: false, cursor: 'not-fully-implemented'}
        }
        // const {expiration, metadata} = value
        const {metadata} = value
        const list_value: ListValue = {name}
        // if (expiration != undefined) {
        //   list_value.expiration = expiration
        // }
        if (metadata != undefined) {
          list_value.metadata = metadata
        }
        keys.push(list_value)
      }
    }
    return {keys, list_complete: true}
  }

  async _add_files(directory: string, prepare_key?: (file_name: string) => string): Promise<number> {
    this._clear()
    if (!prepare_key) {
      const clean_dir = directory.replace(/\/+$/, '')
      const replace_prefix = new RegExp(`^${escape_regex(clean_dir)}\\/`)
      prepare_key = (file_name: string) => file_name.replace(replace_prefix, '')
    }
    return await this._add_directory(directory, prepare_key)
  }

  protected async _add_directory(directory: string, prepare_key: (file_name: string) => string): Promise<number> {
    if (!(await fs.promises.stat(directory)).isDirectory()) {
      throw new Error(`"${directory}" is not a directory`)
    }

    const files = await fs.promises.readdir(directory)
    let count = 0
    for (const file of files) {
      const file_path = path.join(directory, file)
      const stat = await fs.promises.stat(file_path)

      if (stat.isFile()) {
        const content = await fs.promises.readFile(file_path)
        this._put_many({[prepare_key(file_path)]: content})
        count += 1
      } else if (stat.isDirectory()) {
        count += await this._add_directory(file_path, prepare_key)
      }
    }
    return count
  }

  _manifest_json(): string {
    const manifest = Object.fromEntries([...this.kv.keys()].map(k => [k, k]))
    return JSON.stringify(manifest)
  }

  _clear() {
    this.kv.clear()
  }

  _put_many(kv: Record<string, InputValue>) {
    for (const [k, v] of Object.entries(kv)) {
      if (typeof v != 'string' && 'value' in v) {
        this._put(k, v.value, v.metadata)
      } else {
        this._put(k, v, undefined)
      }
    }
  }

  private _put(key: string, raw_value: InputValueValue, metadata: Record<string, string> | undefined): void {
    let value: ArrayBuffer
    if (typeof raw_value == 'string') {
      value = encode(raw_value).buffer
    } else if (Buffer.isBuffer(raw_value)) {
      value = raw_value.buffer
    } else if ('getReader' in raw_value) {
      value = syncRsToArrayBuffer(raw_value)
    } else {
      value = raw_value
    }
    this.kv.set(key, {value, metadata})
  }
}

function prepare_value(v: ArrayBuffer, type: ValueTypeNames | undefined): any {
  switch (type) {
    case 'arrayBuffer':
      return v
    case 'json':
      return JSON.parse(decode(v))
    case 'stream':
      return new EdgeReadableStream([new Uint8Array(v)])
    default:
      return decode(v)
  }
}
