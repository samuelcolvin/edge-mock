#!/usr/bin/env node

import path from 'path'
import express, {Response as ExpressResponse} from 'express'
import webpack from 'webpack'
import livereload from 'livereload'
import {makeEdgeEnv, EdgeKVNamespace, EdgeEnv} from './index'
import live_fetch from './live_fetch'
import {catArraysBufferViews, encode} from 'edge-mock/utils'

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

async function load_config(): Promise<Config> {
  const cwd = process.cwd()
  const dev_server_config = path.join(cwd, 'edge-mock-config.js')
  let config: Record<string, any> = {}
  try {
    config = await import(dev_server_config)
    console.log('edge-mock-config.js found, using it for config')
  } catch (e) {
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
  const kv_namespace = new EdgeKVNamespace()

  const global_extra = {
    __STATIC_CONTENT: kv_namespace,
    __STATIC_CONTENT_MANIFEST: '{}',
    fetch: live_fetch,
  }
  const env = makeEdgeEnv(global_extra)
  const webpack_state = new WebpackState()

  const wp_config = await import(config.webpack_config)

  async function on_webpack_success(stats: MultiStats): Promise<void> {
    console.log(stats.toString('minimal'))
    delete require.cache[require.resolve(config.dist_path)]

    await kv_namespace._add_files(config.dist_assets_path, config.prepare_key)
    global.__STATIC_CONTENT_MANIFEST = kv_namespace._manifestJson()
    try {
      await import(config.dist_path)
      webpack_state.clearError()
    } catch (err) {
      // console.error(`Error importing ${path.relative('.', config.dist_path)}:\n`, e)
      webpack_state.setError(err)
    }
  }

  async function on_webpack_failure(err: Error): Promise<void> {
    console.error(err)
    webpack_state.setError(err)
  }

  const watch_promise: Promise<void> = new Promise(resolve => {
    webpack(wp_config.default).watch({}, (err, stats) => {
      if (err) {
        on_webpack_failure(err).then(() => resolve())
      } else {
        on_webpack_success(stats as MultiStats).then(() => resolve())
      }
    })
  })

  await watch_promise
  return [env, webpack_state]
}

function on_internal_error(res: ExpressResponse, message: string, error: Error, status = 504) {
  console.error(message, error)
  res.status(status)
  res.set({'content-type': 'text/plain'})
  res.send(`${message}:\n\n${error.message}\n${error.stack}\n`)
}

function run_server(config: Config, env: EdgeEnv, webpack_state: WebpackState) {
  const app = express()
  if (config.livereload) {
    const reload_server = livereload.createServer({delay: 300, port: config.livereload_port})
    reload_server.watch(path.dirname(config.dist_path))
  }
  const reload_html = encode(
    `\n\n<script src="http://localhost:${config.livereload_port}/livereload.js?snipver=1"></script>\n`,
  )

  app.all(/.*/, (req, res) => {
    if (webpack_state.error) {
      on_internal_error(res, 'Failed to load worker code', webpack_state.error)
      return
    }

    let listener: (event: FetchEvent) => any
    try {
      listener = env.getListener()
    } catch (err) {
      on_internal_error(res, 'Error getting FetchEvent listener', err)
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
        .catch(err => on_internal_error(res, 'Internal Error awaiting response promise', err))
    }

    try {
      Promise.resolve(listener(event)).catch(err => on_internal_error(res, 'Internal Error running web-worker', err))
    } catch (err) {
      on_internal_error(res, 'Internal Error running web-worker', err)
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
