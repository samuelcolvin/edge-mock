import {EdgeFile, EdgeFormData} from './models'

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

    const headers = extract_headers(body.slice(start, sep))

    let chunk_body = body.slice(sep + 4, end)
    chunk_body = chunk_body.substr(0, chunk_body.lastIndexOf('\r\n'))
    let value: string | File
    if (headers.filename || headers.type) {
      value = new EdgeFile([chunk_body], headers.filename || 'blob', {type: headers.type})
    } else {
      value = chunk_body
    }
    form.append(headers.name, value)
    // + 2 to account for \r\n
    start = end + 2
  }
}

interface Headers {
  name: string
  filename?: string
  type?: string
}

function extract_headers(h: string): Headers {
  const n = h.match(/name ?= ?"(.+?)"/)
  if (!n) {
    throw new Error('name not found in header')
  }
  const headers: Headers = {name: decodeURI(n[1])}

  const fn = h.match(/filename ?= ?"(.+?)"/)
  if (fn) {
    headers.filename = decodeURI(fn[1])
  }

  const ct = h.match(/\r\nContent-Type: ?(.+)/)
  if (ct) {
    headers.type = decodeURI(ct[1])
  }

  return headers
}

export async function formDataAsMultipart(form: FormData): Promise<[string, string]> {
  const boundary = generateBoundary()
  let s = ''
  for (const [key, value] of form) {
    s += await multipartSection(boundary, key, value)
  }
  return [boundary, `${s}--${boundary}--\r\n`]
}

const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
const randChar = () => characters.charAt(Math.floor(Math.random() * characters.length))
const generateBoundary = () => [...Array(32)].map(randChar).join('')

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
