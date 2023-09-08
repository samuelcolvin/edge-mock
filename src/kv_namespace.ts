// https://developers.cloudflare.com/workers/runtime-apis/kv
// TODO expiration
import fs from 'fs'
import path from 'path'
import {encode, decode, escape_regex, rsToArrayBufferView, rsFromArray} from './utils'

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

type ValueTypeNames = 'text' | 'json' | 'arrayBuffer' | 'stream'

export class EdgeKVNamespace implements KVNamespace {
  protected kv: Map<string, InternalValue>

  constructor() {
    this.kv = new Map()
  }

  async get(key: string, options?: {type?: ValueTypeNames; cacheTtl?: number} | ValueTypeNames): Promise<any> {
    options = options || {}
    if (typeof options == 'string') {
      options = {type: options}
    }
    const v = await this.getWithMetadata(key, options.type)
    return v.value || null
  }

  async getWithMetadata(key: string, options?: any): Promise<any> {
    const v = this.kv.get(key)
    if (v == undefined) {
      return {value: null, metadata: null}
    }
    return {value: prepare_value(v.value, options), metadata: v.metadata || {}}
  }

  async put(key: string, value: InputValueValue, {metadata}: {metadata?: Record<string, string>} = {}): Promise<void> {
    let _value: ArrayBuffer
    if (typeof value == 'string') {
      _value = encode(value).buffer
    } else if (Buffer.isBuffer(value)) {
      _value = value.buffer
    } else if ('getReader' in value) {
      const view = await rsToArrayBufferView(value)
      _value = view.buffer
    } else {
      _value = value
    }
    this.kv.set(key, {value: _value, metadata})
  }

  async delete(key: string): Promise<void> {
    this.kv.delete(key)
  }

  async list<Metadata = unknown>(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<Metadata>> {
    options = options || {}
    if (options.cursor) {
      throw new Error('list cursors not yet implemented')
    }

    const prefix = options.prefix
    const limit = options.limit || 1000
    const keys: KVNamespaceListKey<Metadata>[] = []
    for (const [name, value] of this.kv) {
      if (!prefix || name.startsWith(prefix)) {
        if (keys.length == limit) {
          return {keys, list_complete: false, cursor: 'not-fully-implemented'}
        }
        // const {expiration, metadata} = value
        const {metadata} = value
        const list_value: KVNamespaceListKey<Metadata> = {name}
        // if (expiration != undefined) {
        //   list_value.expiration = expiration
        // }
        if (metadata != undefined) {
          list_value.metadata = metadata as Metadata
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
        await this.put(prepare_key(file_path), content)
        count += 1
      } else if (stat.isDirectory()) {
        count += await this._add_directory(file_path, prepare_key)
      }
    }
    return count
  }

  _manifestJson(): string {
    const manifest = Object.fromEntries([...this.kv.keys()].map(k => [k, k]))
    return JSON.stringify(manifest)
  }

  _clear() {
    this.kv.clear()
  }

  async _putMany(kv: Record<string, InputValue>): Promise<void> {
    const promises: Promise<void>[] = []
    for (const [k, v] of Object.entries(kv)) {
      if (typeof v != 'string' && 'value' in v) {
        promises.push(this.put(k, v.value, {metadata: v.metadata}))
      } else {
        promises.push(this.put(k, v, undefined))
      }
    }
    await Promise.all(promises)
  }
}

function prepare_value(v: ArrayBuffer, type: ValueTypeNames | undefined): any {
  switch (type) {
    case 'arrayBuffer':
      return v
    case 'json':
      return JSON.parse(decode(v))
    case 'stream':
      return rsFromArray([new Uint8Array(v)])
    default:
      return decode(v)
  }
}
