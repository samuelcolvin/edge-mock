export class EdgeFormData implements FormData {
  protected map: Map<string, FormDataEntryValue[]> = new Map()

  append(name: string, value: string | Blob | File, fileName?: string): void {
    const value_ = asFormDataEntryValue(value)
    const v = this.map.get(name)
    if (v) {
      v.push(value_)
    } else {
      this.map.set(name, [value_])
    }
  }

  delete(name: string): void {
    this.map.delete(name)
  }

  get(name: string): FormDataEntryValue | null {
    const v = this.map.get(name)
    return v ? v[0] : null
  }

  getAll(name: string): FormDataEntryValue[] {
    return this.map.get(name) || []
  }

  has(name: string): boolean {
    return this.map.has(name)
  }

  set(name: string, value: string | Blob | File, fileName?: string): void {
    this.map.set(name, [asFormDataEntryValue(value)])
  }

  forEach(callbackfn: (value: FormDataEntryValue, key: string, parent: FormData) => void, thisArg?: any): void {
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg)
    }
    for (const [key, array] of this.map) {
      for (const value of array) {
        callbackfn(value, key, this)
      }
    }
  }

  *entries(): IterableIterator<[string, FormDataEntryValue]> {
    for (const [key, array] of this.map) {
      for (const value of array) {
        yield [key, value]
      }
    }
  }

  keys(): IterableIterator<string> {
    return this.map.keys()
  }

  *values(): IterableIterator<FormDataEntryValue> {
    for (const array of this.map.values()) {
      for (const value of array) {
        yield value
      }
    }
  }

  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]> {
    return this.entries()
  }

  async _asMultipart(boundary?: string): Promise<string> {
    boundary = boundary || generateBoundary()
    let s = ''
    for (const [key, value] of this) {
      s += await multipartSection(boundary, key, value)
    }
    return `${s}${boundary}--\r\n`
  }
}

function generateBoundary(): string {
  let boundary = '--------------------------'
  for (let i = 0; i < 24; i++) {
    boundary += Math.floor(Math.random() * 10).toString(16)
  }
  return boundary
}

async function multipartSection(boundary: string, key: string, value: FormDataEntryValue): Promise<string> {
  // TODO do we need to escape name, filename and content-type?
  let header = `Content-Disposition: form-data; name="${key}"`
  let body: string
  if (typeof value != 'string') {
    header += ` filename="${value.name}"\r\nContent-Type: ${value.type || 'application/octet-stream'}`
    body = await value.text()
  } else {
    body = value
  }
  return `${boundary}\r\n${header}\r\n\r\n${body}\r\n`
}

function asFormDataEntryValue(value: string | Blob | File): FormDataEntryValue {
  if (typeof value == 'string' || 'name' in value) {
    return value
  } else {
    return {...value, name: 'blob', lastModified: new Date().getTime()}
  }
}
