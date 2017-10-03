const colors = require('colors')
const express = require('express')
const connection = require('./db/connection.js')
const createDb = require('./db/create.js')
const log = require('../server-common/logger.js')

log('Worker Started')
const app = express()
const listener = app.listen(0, function() {
  process.send({type: 'portbroadcast', data: listener.address().port})
})
process.on('message', function(message) {
  if (message.type === 'config') {
    global.config = message.data
    log('prefix: '.magenta, global.config.prefix, '\n       version:'.magenta, global.config.version)

    // connect to db
    connection.open().then(() => {
      log('Connected to Database')

      const sqlRequest = connection.get().request()
      sqlRequest.query(`
        select OBJECT_ID('agency', 'U') as 'dbcreated'
      `).then((data) => {
        if (data.recordset[0].dbcreated === null) {
          log('Building Database from Template')  
          const creator = new createDb()
          creator.start().then(() => {
            log('Worker Ready')
            process.send({type: 'ready'})
          }).catch(err => {
            console.log(err)
          })
        } else {
          log('Worker Ready')
          process.send({type: 'ready'})
        }
      })
    })
  }
})
app.get('/', function(req, res) {
  res.send('sent from ' + JSON.stringify(global.config))
})