const colors = require('colors')
const express = require('express')
const router = require('./router.js')
const appInsights = require('applicationinsights')

const log = require('../server-common/logger.js')

if (process.env.AZURE_INSIGHTS) {
  appInsights.setup(process.env.AZURE_INSIGHTS)
  appInsights.start()
}

log('Static Server Started')

const app = express()
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'dymajo-transit-static')
  next()
})
app.use(router)

const listener = app.listen(0, function() {
  process.send({type: 'portbroadcast', data: listener.address().port})
})