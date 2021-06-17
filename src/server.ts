#!/usr/bin/env node

import path from 'path'
import express from 'express'
import webpack from 'webpack'
import {makeEdgeEnv, EdgeKVNamespace, EdgeEnv} from './index'
import live_fetch from './live_fetch'

export interface Config {
  webpack_config: string
  dist_path: string
  dist_assets_path: string
  prepare_key: (f: string) => string
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
  } catch (e) {
    console.log('error importing:', e)
  }

  config.webpack_config = config.webpack_config || path.join(cwd, 'webpack.config')
  config.dist_path = config.dist_path || path.join(cwd, 'dist/worker')
  config.dist_assets_path = config.dist_assets_path || path.join(cwd, 'dist/assets')
  config.prepare_key = config.prepare_key || default_prepare_key
  config.port = config.port || 3000

  return config as Config
}

interface MultiStats {
  toString(options?: any): string
}

async function start_webpack(config: Config): Promise<EdgeEnv> {
  const kv_namespace = new EdgeKVNamespace()

  const global_extra = {
    __STATIC_CONTENT: kv_namespace,
    __STATIC_CONTENT_MANIFEST: '{}',
    fetch: live_fetch,
  }
  const env = makeEdgeEnv(global_extra)

  const wp_config = await import(config.webpack_config)
  const watch_promise: Promise<MultiStats> = new Promise((resolve, reject) => {
    webpack(wp_config.default).watch({}, (err, stats) => {
      if (err) {
        reject(err)
      } else {
        resolve(stats as MultiStats)
      }
    })
  })

  const stats = await watch_promise
  console.log(stats.toString('minimal'))
  delete require.cache[require.resolve(config.dist_path)]

  await kv_namespace._add_files(config.dist_assets_path, config.prepare_key)
  global.__STATIC_CONTENT_MANIFEST = kv_namespace._manifestJson()
  await import(config.dist_path)

  return env
}

function run_server(config: Config, env: EdgeEnv) {
  const app = express()

  app.all(/.*/, (req, res) => {
    let listener: (event: FetchEvent) => void
    try {
      listener = env.getListener()
    } catch (err) {
      console.error(err)
      res.status(504)
      res.send(err.toString())
      return
    }

    const {url, method, headers} = req
    const request = new Request(url, {method, headers: headers as Record<string, string>})

    const event = new FetchEvent('fetch', {request})
    event.respondWith = promise => {
      Promise.resolve(promise).then(response => {
        res.status(response.status)
        res.set(Object.fromEntries(response.headers.entries()))
        response.arrayBuffer().then(ab => {
          res.send(new Buffer(ab))
        })
      })
    }
    listener(event)
  })

  app.listen(config.port, () => {
    console.log(`dev app running at http://localhost:${config.port}`)
  })
}

async function main(): Promise<void> {
  const config = await load_config()
  const env = await start_webpack(config)
  await run_server(config, env)
}

if (require.main === module) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
