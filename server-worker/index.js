const colors = require('colors')
const express = require('express')
const pid = ('      ' + process.pid.toString(16)).slice(-6).green

let config = {}
console.log(pid, 'Started Child')
const app = express()
const listener = app.listen(0, function() {
  process.send({type: 'portbroadcast', data: listener.address().port})
})
process.on('message', function(message) {
  if (message.type === 'config') {
    config = message.data
    console.log(pid, 'Retrieved Config', config)
  }
})
app.get('/', function(req, res) {
  res.send('sent from ' + JSON.stringify(config))
})