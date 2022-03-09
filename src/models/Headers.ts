// stubs https://developer.mozilla.org/en-US/docs/Web/API/Headers

export class EdgeHeaders implements Headers {
  protected readonly map: Map<string, string>

  constructor(init: HeadersInit | Map<string, string> = {}) {
    if (init instanceof EdgeHeaders) {
      this.map = new Map(init)
    } else {
      let a: [string, string][]
      if (init instanceof Map) {
        a = [...init]
      } else if (Array.isArray(init)) {
        a = init as [string, string][]
      } else {
        a = Object.entries(init)
      }
      this.map = new Map(a.map(([k, v]) => [k.toLowerCase(), v]))
    }
  }

  entries(): IterableIterator<[string, string]> {
    return this.map.entries()
  }

  keys(): IterableIterator<string> {
    return this.map.keys()
  }

  values(): IterableIterator<string> {
    return this.map.values()
  }

  append(name: string, value: string): void {
    const k = name.toLowerCase()
    if (this.map.has(k)) {
      value = `${this.map.get(k)},${value}`
    }
    this.map.set(k, value)
  }

  delete(name: string): void {
    this.map.delete(name.toLowerCase())
  }

  forEach(callback: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
    const cb = (value: string, key: string): void => callback(value, key, this)
    this.map.forEach(cb, thisArg)
  }

  get(name: string): string | null {
    const k = name.toLowerCase()
    return this.map.get(k) || null
  }

  getAll(name: string): string[] {
    throw Error('getAll is not implemented')
  }

  has(name: string): boolean {
    return this.map.has(name.toLowerCase())
  }

  set(name: string, value: string): void {
    this.map.set(name.toLowerCase(), value)
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries()
  }
}

export function asHeaders(h: HeadersInit | undefined, default_headers: Record<string, string> = {}): Headers {
  if (!h) {
    return new EdgeHeaders(default_headers)
  } else if (h instanceof EdgeHeaders) {
    return h
  } else {
    return new EdgeHeaders(h)
  }
}
