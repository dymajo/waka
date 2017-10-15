const colors = require('colors')
const express = require('express')
const router = require('./router.js')
const bodyParser = require('body-parser')

const log = require('../server-common/logger.js')

log('Static Server Started')

const app = express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'dymajo-transit-static')
  next()
})
app.use(router)

const listener = app.listen(0, function() {
  process.send({type: 'portbroadcast', data: listener.address().port})
})