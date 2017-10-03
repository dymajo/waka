const path = require('path')
const express = require('express')
const colors = require('colors')
const http = require('http')
const httpProxy = require('http-proxy')
const Worker = require('./worker.js')
const connection = require('./connection.js')

const dbConfig = {
  user: 'node',
  password: 'node',
  server: 'localhost', // You can use 'localhost\\instance' to connect to named instance 
  database: 'Transit',
  transactionLimit: 10000, // 5000 is good for azure, 100,000 seems to be fine for Local SQL Express
  connectionTimeout: 60000,
  requestTimeout: 60000
}

const mapper = {
  'nz-akl': {
    prefix: 'nz-akl',
    version: '20170928152758_v59.3',
  },
  'nz-wlg': {
    prefix: 'nz-wlg',
    version: '20170828_20170808-090059',
  },
}
mapper['nz-akl'].db = JSON.parse(JSON.stringify(dbConfig))
mapper['nz-akl'].db.database = mapper['nz-akl'].prefix.replace(/-/g, '_') + '_' + mapper['nz-akl'].version.replace(/-/g, '_').replace(/\./g, '_')
mapper['nz-wlg'].db = JSON.parse(JSON.stringify(dbConfig))
mapper['nz-wlg'].db.database = mapper['nz-wlg'].prefix.replace(/-/g, '_') + '_' + mapper['nz-wlg'].version.replace(/-/g, '_').replace(/\./g, '_')

connection.isReady.then(() => {
  let akl = new Worker(mapper['nz-akl'])
  akl.start().then(() => {
    mapper['nz-akl'].port = akl.port
  })
  let wlg = new Worker(mapper['nz-wlg'])
  wlg.start().then(() => {
    mapper['nz-wlg'].port = wlg.port
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