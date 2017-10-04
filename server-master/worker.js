const path = require('path')
const child_process = require('child_process')
const sql = require('mssql')
const request = require('request')
const connection = require('./connection.js')
const child = path.join(__dirname, '../server-worker/index.js')
const log = require('../server-common/logger.js')

class Worker {
  constructor(config) {
    this.config = config
  }

  url() {
    return 'http://127.0.0.1:' + this.port
  }

  // Starts worker
  start() {
    return new Promise((resolve, reject) => {
      // Creates empty database
      // Worker will create tables & procedures automatically
      if (!(this.config.prefix && this.config.version)) {
        reject('Please supply prefix and version.')
      }
      const dbName = this.config.db.database
      const sqlRequest = connection.get().request()
      sqlRequest.input('name', sql.VarChar, dbName)
      sqlRequest.query(`
        IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = @name)
        EXEC('CREATE DATABASE '+ @name)
      `).then(() => {
        // Starts worker
        this.process = child_process.fork(child).on('message', (message) => {
          if (message.type === 'portbroadcast') {
            this.port = message.data
            this.process.send({type: 'config', data: this.config})
          } else if (message.type === 'ready') {
            resolve(this.port)
          }
        })
      }).catch(err => {
        console.log(err)
        reject(err)
      })
    })
  }

  // Stops worker
  stop() {
    return new Promise((resolve, reject) => {
      this.process.on('exit', function() {
        resolve()
      })
      this.process.kill('SIGINT')
    })
  }

  // Instructs worker to download & build GTFS
  import() {
    return new Promise((resolve, reject) => {
      log('Started Import on', this.config.prefix, this.config.version)
      request(this.url() + '/internal/import')
    })
  }
  
  // Stops worker & deletes database
  destroy() {
    return new Promise((resolve, reject) => {
      this.stop().then(() => {
        // Delete database  
        const dbName = this.config.db.database
        const sqlRequest = connection.get().request()
        sqlRequest.input('name', sql.VarChar, dbName)
        sqlRequest.query(`
          IF EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = @name)
          EXEC('DROP DATABASE '+ @name)
        `).then(data => resolve(data))
          .catch(err => reject(err))
      })
    })
  }
}
module.exports = Worker