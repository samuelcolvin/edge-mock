#!/usr/bin/env node

import path from 'path'
import express from 'express'
import webpack from 'webpack'
import {makeEdgeEnv, EdgeKVNamespace} from './index'
import live_fetch from './live_fetch'

const cwd = process.cwd()
const webpack_config = path.join(cwd, 'webpack.config')
const dist_path = path.join(cwd, 'dist/worker')
const dist_assets_path = path.join(cwd, 'dist/assets')
const prepare_key = (f: string) => f.replace(/.*?dist\/assets\//, '')
const port = 3000

declare const global: any

const kv_namespace = new EdgeKVNamespace()

const global_extra = {
  __STATIC_CONTENT: kv_namespace,
  __STATIC_CONTENT_MANIFEST: '{}',
  fetch: live_fetch,
}
const env = makeEdgeEnv(global_extra)

import(webpack_config).then(wp_config => {
  webpack(wp_config.default).watch({}, (err, stats) => {
    console.log(stats && stats.toString('minimal'))

    if (!err) {
      delete require.cache[require.resolve(dist_path)]

      kv_namespace._add_files(dist_assets_path, prepare_key).then(() => {
        global.__STATIC_CONTENT_MANIFEST = kv_namespace._manifestJson()
        import(dist_path)
      })
    }
  })
})

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

app.listen(port, () => {
  console.log(`dev app running at http://localhost:${port}`)
})
