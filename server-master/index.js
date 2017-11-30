const express = require('express')
const colors = require('colors')
const bodyParser = require('body-parser')
const path = require('path')
const appInsights = require('applicationinsights')

const config = require('../config.js')
const WorkerManager = require('./workerManager.js')
const publicRouter = require('./publicRouter.js')
const privateRouter = require('./privateRouter.js')
const createDb = require('./db/create.js')
const Updaters = require('./updaters/index.js')

const log = require('../server-common/logger.js')
const connection = require('./db/connection.js')

if (process.env.AZURE_INSIGHTS) {
  appInsights.setup(process.env.AZURE_INSIGHTS)
  appInsights.start()
  log('Started Azure Insights')
} else {
  log('Azure Insights API key is undefined.'.red)
}

const updater = new Updaters()

async function cb() {
  await WorkerManager.load()
  await WorkerManager.startAll()
  await WorkerManager.loadMappings()
  WorkerManager.startHeart()
  await updater.start()
}

connection.isReady.then(() => {
  log('Connected to Database')
  const sqlRequest = connection.get().request()
  sqlRequest.query(`
    select OBJECT_ID('workers', 'U') as 'dbcreated'
  `).then((data) => {
    if (data.recordset[0].dbcreated === null) {
      const creator = new createDb()
      creator.start().then(cb()).catch((err) => {
        log(err)
      })
    } else {
      cb()
    }
  }).catch((err) => {
    log(err)
  })
  
})

const publicApp = express()
publicApp.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8009')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Powered-By', 'dymajo-transit-master')
  next() 
})
// redirects trailing slash to /
publicApp.use(function(req, res, next) {
  if (req.url.substr(-1) == '/' && req.url.length > 1) {
    res.redirect(301, req.url.slice(0, -1))
  } else {
    next()
  }
})
publicApp.use(publicRouter)
publicApp.listen(config.publicport)
log('Public API Started on Port', config.publicport)

const privateApp = express()
privateApp.use(bodyParser.json())
privateApp.use(privateRouter)
privateApp.listen(config.privateport)
log('Private API Started on Port', config.privateport)
