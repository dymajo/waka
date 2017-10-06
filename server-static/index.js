const colors = require('colors')
const express = require('express')

const log = require('../server-common/logger.js')

log('Static Server Started')

const app = express()
app.get('/', function(req, res) {
  res.send('poos')
})
app.get('/*', function(req, res) {
  res.send('other')
})
const listener = app.listen(0, function() {
  process.send({type: 'portbroadcast', data: listener.address().port})
})