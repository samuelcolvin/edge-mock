import express, {request} from 'express'
import webpack from 'webpack'
import fetch from 'node-fetch'
import {makeEdgeEnv, EdgeKVNamespace} from './index'

const webpack_config = './webpack.config'
const dist_path = './dist/worker'
const dist_assets_path = './dist/assets'
const prepare_key = (f: string) => f.replace(/^dist\/assets\//, '')
const port = 3000

// require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create()

const kv_namespace = new EdgeKVNamespace()

const global_extra = {
  __STATIC_CONTENT: kv_namespace,
  fetch
}

const env = makeEdgeEnv(global_extra)

import(webpack_config).then(wp_config => {
  webpack(wp_config).watch({}, (err, stats) => {
    console.log(stats && stats.toString('minimal'))

    if (!err) {
      delete require.cache[require.resolve(dist_path)]

      kv_namespace._from_files(dist_assets_path, prepare_key).then(() => {
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
  event.respondWith = (promise) => {
    Promise.resolve(promise).then(response => {
      res.status(response.status)
      res.set(Object.fromEntries(response.headers.entries()))
      response.text().then(text => res.send(text))
    })
  }
  listener(event)
})

app.listen(port, () => {
  console.log(`dev app running at http://localhost:${port}`)
})


