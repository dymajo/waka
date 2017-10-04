const express = require('express')
const colors = require('colors')
const bodyParser = require('body-parser')

const WorkerManager = require('./workerManager.js')
const publicRouter = require('./publicRouter.js')
const privateRouter = require('./privateRouter.js')
const createDb = require('./db/create.js')

const log = require('../server-common/logger.js')
const connection = require('./db/connection.js')

async function cb() {
  await WorkerManager.load()
  await WorkerManager.startAll()
  await WorkerManager.loadMappings()
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
publicApp.use(bodyParser.json())
publicApp.use(publicRouter)
publicApp.listen(8000)
log('Public API Started on Port 8000')

const privateApp = express()
privateApp.use(bodyParser.json())
privateApp.use(privateRouter)
privateApp.listen(8001)
log('Private API Started on Port 8001')
