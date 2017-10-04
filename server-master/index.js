const express = require('express')
const colors = require('colors')
const bodyParser = require('body-parser')
const httpProxy = require('http-proxy')

const WorkerManager = require('./workerManager.js')
const privateRouter = require('./privateRouter.js')

const log = require('../server-common/logger.js')
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
    version: '20170928161545_v59.4'
  },
  'nz-akl2': {
    prefix: 'nz-akl',
    version: '20170928152758_v59.3'
  },
  'nz-wlg': {
    prefix: 'nz-wlg',
    version: '20170828_20170808-090059'
  }
}
mapper['nz-akl'].db = JSON.parse(JSON.stringify(dbConfig))
mapper['nz-akl'].db.database =
  mapper['nz-akl'].prefix.replace(/-/g, '_') +
  '_' +
  mapper['nz-akl'].version.replace(/-/g, '_').replace(/\./g, '_')
mapper['nz-akl2'].db = JSON.parse(JSON.stringify(dbConfig))
mapper['nz-akl2'].db.database =
  mapper['nz-akl2'].prefix.replace(/-/g, '_') +
  '_' +
  mapper['nz-akl2'].version.replace(/-/g, '_').replace(/\./g, '_')
mapper['nz-wlg'].db = JSON.parse(JSON.stringify(dbConfig))
mapper['nz-wlg'].db.database =
  mapper['nz-wlg'].prefix.replace(/-/g, '_') +
  '_' +
  mapper['nz-wlg'].version.replace(/-/g, '_').replace(/\./g, '_')

connection.isReady.then(() => {
  WorkerManager.add(mapper['nz-akl2'])
  WorkerManager.add(mapper['nz-akl']).then(() => {
    // sets the default version
    WorkerManager.setMapping(mapper['nz-akl'].prefix, mapper['nz-akl'].version)
  })
  WorkerManager.add(mapper['nz-wlg']).then(() => {
    // sets the default version
    WorkerManager.setMapping(mapper['nz-akl'].prefix, mapper['nz-akl'].version)
  })
})

const proxy = httpProxy.createProxyServer({
  ignorePath: true
})

const publicApp = express()
publicApp.use(bodyParser.json())
const proxyHandle = function(req, res) {
  const port = WorkerManager.getMapping(req.params.prefix)
  if (port === 404) {
    res.status(404).send({message: 'prefix not found'})
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + port + '/a/' + req.params[0] })
  }
}
publicApp.all('/a/:prefix', proxyHandle)
publicApp.all('/a/:prefix/*', proxyHandle)
publicApp.listen(8000)
log('Public API Started on Port 8000')

const privateApp = express()
privateApp.use(bodyParser.json())
privateApp.use(privateRouter)
privateApp.listen(8001)
log('Private API Started on Port 8001')
