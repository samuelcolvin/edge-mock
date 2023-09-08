import {EdgeFile, EdgeFormData} from './models'
import {FormDataEntryValue} from './models/FormData'

export function stringAsFormData(boundary: string, body: string): FormData {
  let start = body.indexOf(`${boundary}\r\n`)
  if (start == -1) {
    throw new Error('boundary not found anywhere in body')
  }

  const boundaryLength = boundary.length
  // + 2 to account for \r\n
  start = start + boundaryLength + 2
  const form = new EdgeFormData()
  while (true) {
    const end = body.indexOf(boundary, start)
    if (end == -1) {
      return form
    }
    const sep = body.indexOf('\r\n\r\n', start)
    if (sep == -1 || sep > end) {
      throw new Error('body is not well formed, no break found between headers and body')
    }

    const header_content = body.slice(start, sep)
    const n = header_content.match(/name ?= ?"(.+?)"/)
    if (!n) {
      throw new Error('name not found in header')
    }
    const name = decodeURI(n[1])
    let filename: string | undefined = undefined
    let type: string | undefined = undefined

    const fn = header_content.match(/filename ?= ?"(.+?)"/)
    if (fn) {
      filename = decodeURI(fn[1])
    }
    const ct = header_content.match(/\r\nContent-Type: ?(.+)/)
    if (ct) {
      type = decodeURI(ct[1])
    }

    let chunk_body = body.slice(sep + 4, end)
    chunk_body = chunk_body.substr(0, chunk_body.lastIndexOf('\r\n'))

    if (filename || type) {
      form.append(name, new EdgeFile([chunk_body], filename || 'blob', {type}))
    } else {
      form.append(name, chunk_body)
    }

    // + 2 to account for \r\n
    start = end + boundaryLength + 2
  }
}

export async function formDataAsString(form: FormData, boundary?: string): Promise<[string, string]> {
  boundary = boundary || generateBoundary()
  let s = ''
  for (const [key, value] of form) {
    s += await multipartSection(boundary, key, value)
  }
  return [boundary, `${s}--${boundary}--\r\n`]
}

export const generateBoundary = () => [...Array(32)].map(randChar).join('')
const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
const randChar = () => characters.charAt(Math.floor(Math.random() * characters.length))

async function multipartSection(boundary: string, key: string, value: FormDataEntryValue): Promise<string> {
  let header = `Content-Disposition: form-data; name="${encodeURI(key)}"`
  let body: string
  if (typeof value == 'string') {
    body = value
  } else {
    header += `; filename="${encodeURI(value.name)}"`
    if (value.type) {
      header += `\r\nContent-Type: ${encodeURI(value.type)}`
    }
    body = await value.text()
  }
  return `--${boundary}\r\n${header}\r\n\r\n${body}\r\n`
}
