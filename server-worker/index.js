const colors = require('colors')
const express = require('express')
const connection = require('./connection.js')
global.pid = ('      ' + process.pid.toString(16)).slice(-6).green

console.log(global.pid, 'Worker Started')
const app = express()
const listener = app.listen(0, function() {
  process.send({type: 'portbroadcast', data: listener.address().port})
})
process.on('message', function(message) {
  if (message.type === 'config') {
    global.config = message.data
    console.log(global.pid, 'prefix: '.magenta, global.config.prefix, '\n       version:'.magenta, global.config.version)

    // connect to db
    connection.open().then(() => {
      console.log(global.pid, 'Connected to Database')

      const sqlRequest = connection.get().request()
      sqlRequest.query(`
        select OBJECT_ID('agency', 'U') as 'dbcreated'
      `).then((data) => {
        if (data.recordset[0].dbcreated === null) {
          console.log(global.pid, 'Building Database from Template')  
          process.send({type: 'ready'})
        } else {
          console.log(global.pid, 'Worker Ready')
          process.send({type: 'ready'})
        }
      })
    })
  }
})
app.get('/', function(req, res) {
  res.send('sent from ' + JSON.stringify(global.config))
})