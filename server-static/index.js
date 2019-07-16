const express = require('express')
const bodyParser = require('body-parser')
const router = require('./router.js')

const log = require('./lib/logger.js')

const app = express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'dymajo-transit-static')
  next()
})
app.use(router)

let port = 0
if (process.env.serverStaticPort) {
  port = parseInt(process.env.serverStaticPort)
}
const listener = app.listen(port, function() {
  log('Static Server Started on Port', listener.address().port)
  if (process.send) {
    process.send({ type: 'portbroadcast', data: listener.address().port })
  } else {
    log('Not running as a subprocess. ')
  }
})
