import {EdgeFile} from './Blob'

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
}

function asFormDataEntryValue(value: string | Blob | File): FormDataEntryValue {
  if (typeof value == 'string' || 'name' in value) {
    return value
  } else {
    const parts = (value as any)._parts
    return new EdgeFile(parts, 'blob')
  }
}
