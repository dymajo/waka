const path = require('path')
const child_process = require('child_process')
const sql = require('mssql')
const request = require('request')
const connection = require('./db/connection.js')
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
      this.process.on('exit', () => {
        log('Stopped Worker', this.config.prefix, this.config.version)
        resolve()
      })
      this.process.kill('SIGINT')
    })
  }

  // Instructs worker to download & build GTFS
  import(mode, force = false) {
    return new Promise((resolve, reject) => {
      const sqlRequest = connection.get().request()
      sqlRequest.input('name', sql.VarChar, this.config.db.database)
      sqlRequest.query(`
        select status from workers where dbname = @name;
      `).then(data => {
        if (data.recordset[0].status === 'empty' || force === true) {
          log('Started Import on', this.config.prefix, this.config.version)
          // go to sql, update the db
          request(this.url() + '/internal/import/' + mode, () => {
            const sqlRequest = connection.get().request()
            sqlRequest.input('name', sql.VarChar, this.config.db.database)
            sqlRequest.query(`
              update workers set status = 'importing' where dbname = @name;
            `).then(resolve).catch(reject)
          })
        } else {
          reject({message: 'import already started, force to try again'})
        }
      })
    })
  }

  complete() {
    return new Promise((resolve, reject) => {
      const sqlRequest = connection.get().request()
      sqlRequest.input('name', sql.VarChar, this.config.db.database)
      sqlRequest.query(`
        update workers set status = 'imported' where dbname = @name;
      `).then(resolve).catch(reject)
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