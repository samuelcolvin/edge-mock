#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import express, {Response as ExpressResponse} from 'express'
import webpack from 'webpack'
import livereload from 'livereload'
import {makeEdgeEnv, EdgeKVNamespace, EdgeEnv} from './index'
import live_fetch from './live_fetch'
import {catArraysBufferViews, encode} from './utils'

export interface Config {
  webpack_config: string
  dist_path: string
  dist_assets_path: string
  prepare_key: (f: string) => string
  livereload: boolean
  livereload_port: number
  port: number
}

declare const global: any

const default_prepare_key = (f: string) => f.replace(/.*?dist\/assets\//, '')

function pathExists(path: string): Promise<boolean> {
  return fs.promises
    .access(path, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

async function load_config(): Promise<Config> {
  const cwd = process.cwd()
  const dev_server_config = path.join(cwd, 'edge-mock-config.js')
  let config: Record<string, any> = {}
  if (await pathExists(dev_server_config)) {
    try {
      config = await import(dev_server_config)
      console.log('edge-mock-config.js found, using it for config')
    } catch (e) {
      console.error('error loading', dev_server_config, e)
    }
  } else {
    console.log('edge-mock-config.js not found, using default config')
  }

  config.webpack_config = config.webpack_config || path.join(cwd, 'webpack.config')
  config.dist_path = config.dist_path || path.join(cwd, 'dist/worker')
  config.dist_assets_path = config.dist_assets_path || path.join(cwd, 'dist/assets')
  config.prepare_key = config.prepare_key || default_prepare_key
  config.port = config.port || 3000
  if (!('livereload' in config)) {
    config.livereload = true
  }
  config.livereload_port = config.livereload_port || 35729

  return config as Config
}

interface MultiStats {
  toString(options?: any): string
}

class WebpackState {
  protected _error: Error | null = null

  get error(): Error | null {
    return this._error
  }

  clearError(): void {
    this._error = null
  }

  setError(err: Error): void {
    this._error = err
  }
}

async function start_webpack(config: Config): Promise<[EdgeEnv, WebpackState]> {
  let static_content_kv: EdgeKVNamespace

  const env = makeEdgeEnv({fetch: live_fetch})
  const webpack_state = new WebpackState()

  async function on_webpack_success(stats: MultiStats): Promise<void> {
    console.log(stats.toString('minimal'))
    delete require.cache[require.resolve(config.dist_path)]

    if (await pathExists(config.dist_assets_path)) {
      if (!static_content_kv) {
        static_content_kv = new EdgeKVNamespace()
        global.__STATIC_CONTENT = static_content_kv
        console.log('adding KV store "__STATIC_CONTENT" to global namespace')
      }
      await static_content_kv._add_files(config.dist_assets_path, config.prepare_key)
      global.__STATIC_CONTENT_MANIFEST = static_content_kv._manifestJson()
    }
    env.clearEventListener()
    try {
      await import(config.dist_path)
    } catch (err) {
      webpack_state.setError(err)
      return
    }
    webpack_state.clearError()
  }

  const wp_config = await import(config.webpack_config)
  webpack(wp_config.default).watch({}, (err, stats) => {
    if (err) {
      console.error(err)
      webpack_state.setError(err)
    } else {
      on_webpack_success(stats as MultiStats)
    }
  })

  return [env, webpack_state]
}

function livereload_script(config: Config): string {
  if (config.livereload) {
    return `\n\n<script src="http://localhost:${config.livereload_port}/livereload.js?snipver=1"></script>\n`
  } else {
    return ''
  }
}

class ErrorResponse {
  protected readonly response: ExpressResponse
  protected readonly config: Config
  protected readonly html_template = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{status} Error</title>
    <meta name="description" content="{message}" />
    <style>
      body {
        display: flex;
        color: #24292e;
        justify-content: center;
        margin: 40px 10px 60px;
        font-size: 16px;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, 
          "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      }
      main {
        width: min(calc(100vw - 20px), 902px);
        box-sizing: border-box;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        padding: 20px 15px 20px;
        word-wrap: break-word;
        min-height: 400px;
      }
      aside {
        font-size: 0.9rem;
        color: #666;
      }
      pre code {
        font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
        background: #f6f8fa;
        border-radius: 6px;
        padding: 16px;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        display: block;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Error</h1>
      <p><b>{message}</b></p>
      {detail}
      <h2>Config:</h2>
      <pre><code>{config}</code></pre>
      <aside>
        (This page is shown by 
        <a href="https://github.com/samuelcolvin/edge-mock#development-server" target="_blank">edge-mock-server</a>, 
        it's a summary of an error that occurred while trying to serve the above web-worker application.)
      </aside>
    </main>
  </body>
</html>{livereload}
`

  constructor(response: ExpressResponse, config: Config) {
    this.response = response
    this.config = config
  }

  onError(message: string, error?: Error, status = 502): void {
    this.response.status(status)
    this.response.set({'content-type': 'text/html'})
    const context: Record<string, string> = {
      message: this.escape(message),
      status: status.toString(),
      detail: '',
      livereload: livereload_script(this.config),
      config: this.escape(JSON.stringify(this.config, null, 2)),
    }

    if (error) {
      const stack = error.stack?.toString().replace(/\n.*(\/express\/lib\/|edge-mock\/server)(.|\n)*/, '')
      context.detail = `<pre><code>${this.escape(error.message)}\n${this.escape(stack || '')}</code></pre>`
      console.error(`${message}\n${error.message}\n${stack || ''}`)
    } else {
      console.error(message)
    }

    let html = this.html_template
    for (const [key, value] of Object.entries(context)) {
      html = html.replace(new RegExp(`{${key}}`, 'g'), value)
    }
    this.response.send(html)
  }

  protected escape(s: string): string {
    const html_tags: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;'}
    return s.replace(/[&<>]/g, letter => html_tags[letter] || letter)
  }
}

function run_server(config: Config, env: EdgeEnv, webpack_state: WebpackState) {
  const app = express()
  if (config.livereload) {
    const reload_server = livereload.createServer({delay: 300, port: config.livereload_port})
    reload_server.watch(path.dirname(config.dist_path))
  }
  const reload_html = encode(livereload_script(config))

  app.all(/.*/, (req, res) => {
    const error_handler = new ErrorResponse(res, config)
    if (webpack_state.error) {
      error_handler.onError('Failed to load worker code', webpack_state.error)
      return
    }

    let listener: (event: FetchEvent) => any
    try {
      listener = env.getListener()
    } catch (err) {
      error_handler.onError(err.message)
      return
    }

    const {url, method, headers} = req
    const request = new Request(url, {method, headers: headers as Record<string, string>})

    const event = new FetchEvent('fetch', {request})
    event.respondWith = promise => {
      Promise.resolve(promise)
        .then(response => {
          res.status(response.status)
          res.set(Object.fromEntries(response.headers.entries()))
          response.arrayBuffer().then(ab => {
            let body: Uint8Array | ArrayBuffer = ab
            if (config.livereload && (response.headers.get('content-type') || '').includes('text/html')) {
              body = catArraysBufferViews([new Uint8Array(ab), reload_html])
            }
            res.send(Buffer.from(body))
          })
        })
        .catch(err => error_handler.onError('Internal Error awaiting response promise', err))
    }

    try {
      Promise.resolve(listener(event)).catch(err => error_handler.onError('Internal Error running web-worker', err))
    } catch (err) {
      error_handler.onError('Internal Error running web-worker', err)
    }
  })

  app.listen(config.port, () => {
    console.log(`dev app running at http://localhost:${config.port}, livereload: ${config.livereload}`)
  })
}

async function main(): Promise<void> {
  const config = await load_config()
  // console.log('starting webpack, config: %o', config)
  const [env, wps] = await start_webpack(config)
  await run_server(config, env, wps)
}

if (require.main === module) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
