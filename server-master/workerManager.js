const Worker = require('./worker.js')
const connection = require('./db/connection.js')
const sql = require('mssql')
const log = require('../server-common/logger.js')

const WorkerManager = {
  _workerTable: {},
  _workerMap: {},
  _currentMapping: {},
  _currentWorkers: {},
  provision: function(conf) {
    return new Promise((resolve, reject) => {
      // manipulates the db into a nice shape
      conf.db = JSON.parse(JSON.stringify(require('./db/config-'+conf.dbconfig+'.js')))
      conf.db.database = conf.dbname

      const worker = new Worker(conf)
      worker.start().then(() => {
        WorkerManager._currentWorkers[worker.port] = worker
        WorkerManager._workerMap[conf.prefix + '|' + conf.version] = worker.port
        resolve()
      }).catch(reject)
    })
  },
  getWorker: function(port) {
    if (port in WorkerManager._currentWorkers) {
      return WorkerManager._currentWorkers[port]
    }
    return null
  },
  getPort: function(prefix, version) {
    return WorkerManager._workerMap[prefix + '|' + version]
  },
  getMapping: function(prefix) {
    const pair = WorkerManager._currentMapping[prefix]
    const map = WorkerManager._workerMap[pair]
    if (map) {
      return map
    }
    return 404
  },
  setMapping: function(prefix, version) {
    WorkerManager._currentMapping[prefix] = prefix + '|' + version
    // set this in sql
  },
  loadMappings: function() {
    // load from sql 
  },
  deleteMapping: function(prefix) {
    delete WorkerManager._currentMapping[prefix]
    // delete from sql
  },
  getAll: function() {
    const ret = []
    Object.keys(WorkerManager._workerTable).forEach((key) => {
      const item = Object.assign({}, WorkerManager._workerTable[key])
      item.port = WorkerManager._workerMap[key]
      delete item.db
      ret.push(item)
    })
    return ret
  },
  // adds a new worker config, saves to db
  add: function(conf) {
    return new Promise((resolve, reject) => {
      // change when we start clustering over different sql databases
      conf.status = conf.status || 'empty'
      conf.startpolicy = conf.startpolicy || 'auto'
      conf.dbconfig = conf.dbconfig || 'slave'
      conf.dbname = conf.dbname ||
        (conf.prefix.replace(/-/g, '_') + 
        '_' +
        conf.version.replace(/-/g, '_').replace(/\./g, '_'))

      const sqlRequest = connection.get().request()
      sqlRequest.input('prefix', sql.VarChar(50), conf.prefix)
      sqlRequest.input('version', sql.VarChar(50), conf.version)
      sqlRequest.input('status', sql.VarChar(50), conf.status)
      sqlRequest.input('startpolicy', sql.VarChar(50), conf.startpolicy)
      sqlRequest.input('dbconfig', sql.VarChar(50), conf.dbconfig)
      sqlRequest.input('dbname', sql.VarChar(100), conf.dbname)
      sqlRequest.query(`
        INSERT INTO workers (prefix, version, status, startpolicy, dbconfig, dbname)
        VALUES (@prefix, @version, @status, @startpolicy, @dbconfig, @dbname)
      `).then(() => {
        log('Added Worker', conf.prefix, conf.version)
        WorkerManager._workerTable[conf.prefix+'|'+conf.version] = conf
        resolve()
      }).catch(reject)
    })
  },
  // loads all available workers from the db
  load: function() {
    return new Promise((resolve, reject) => {
      const sqlRequest = connection.get().request()
      sqlRequest.query('select * from workers').then((result) => {
        WorkerManager._workerTable = {}
        result.recordset.forEach((item) => {
          WorkerManager._workerTable[item.prefix+'|'+item.version]  = item
        })
        log('Loaded workers from Database')
        resolve()
      }).catch(reject)
    })
  },
  // starts a particular worker
  start: function(prefix, version) {
    return new Promise((resolve, reject) => {
      if (typeof WorkerManager.getPort(prefix, version) !== 'undefined') {
        return reject('already started')
      }
      const conf = WorkerManager._workerTable[prefix+'|'+version]
      WorkerManager.provision(conf).then(resolve).catch(reject)
    })
  },
  // starts all the workers set to auto start
  startAll: function() {
    return new Promise((resolve, reject) => {
      log('Starting all workers')
      let promises = []
      Object.keys(WorkerManager._workerTable).forEach((key) => {
        const item = WorkerManager._workerTable[key]
        if (item.startpolicy === 'auto') {
          if (typeof WorkerManager.getPort(item.prefix, item.version) !== 'undefined') {
            log('Skipping', item.prefix, item.version, 'already started')
            return 
          } 
          promises.push(WorkerManager.provision(item))
        }
      })
      Promise.all(promises).then(resolve).catch(reject)
    })
  },
  // stops a worker
  stop: function(prefix, version) {
    return new Promise((resolve, reject) => {
      const port = WorkerManager.getPort(prefix, version)
      WorkerManager.getWorker(port).stop().then(() => {
        const key = prefix + '|' + version
        delete WorkerManager._workerMap[key]
        delete WorkerManager._currentWorkers[port]
        resolve()
      }).catch(reject)
    })
  },
  delete: function(prefix, version) {
    return new Promise((resolve, reject) => {
      // stops it, if startedw
      if (typeof WorkerManager.getPort(prefix, version) !== 'undefined') {
        WorkerManager.stop(prefix, version)
      }

      // delete in sql
      delete WorkerManager._workerTable[prefix+'|'+version]

      const sqlRequest = connection.get().request()
      sqlRequest.input('prefix', sql.VarChar(50), prefix)
      sqlRequest.input('version', sql.VarChar(50), version)
      sqlRequest.query('delete from workers where prefix = @prefix and version = @version').then((result) => {
        log('Deleted Worker', prefix, version)
        resolve(result)
      }).catch(reject)
    })
  }
}
module.exports = WorkerManager