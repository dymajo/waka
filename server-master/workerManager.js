const Worker = require('./worker.js')

const WorkerManager = {
  _workerMap: {},
  _currentMapping: {},
  _currentWorkers: {},
  add: function(config) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(config)
      worker.start().then(() => {
        WorkerManager._currentWorkers[worker.port] = worker
        WorkerManager._workerMap[config.prefix + '|' + config.version] = worker.port
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
  }
}
module.exports = WorkerManager