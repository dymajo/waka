const path = require('path')
const child_process = require('child_process')
const express = require('express')
const colors = require('colors')
const http = require('http')
const httpProxy = require('http-proxy')

const child = path.join(__dirname, '../server-worker/index.js')

const mapper = {
  'nz-akl': {
    prefix: 'nz-akl',
    version: 1,
  },
  'nz-wlg': {
    prefix: 'nz-wlg',
    version: 1,
  },
}
Object.keys(mapper).forEach((prefix) => {
  const proc = child_process.fork(child).on('message', function(message) {
    if (message.type === 'portbroadcast') {
      mapper[prefix].port = message.data
      proc.send({type: 'config', data: mapper[prefix]})
    } else {
      console.log('retrieved from', prefix, message)
    }
  })
})

const proxy = httpProxy.createProxyServer({})

// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
const server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  const port = mapper[Object.keys(mapper)[Math.round(Math.random())]].port
  proxy.web(req, res, { target: 'http://127.0.0.1:' + port })
})

console.log('Master'.red, 'Listening on Port 8000')
server.listen(8000)