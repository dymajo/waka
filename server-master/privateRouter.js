const log = require('../server-common/logger.js')
const router = require('express').Router()
const WorkerManager = require('./workerManager.js')

// tells worker to go and download shit
router.post('/import-start', function(req, res) {
  const body = req.body
  const worker = WorkerManager.getWorker(WorkerManager.getPort(body.prefix, body.version))
  if (worker) {
    worker.import()
    res.send({message: 'Import Started.'})
  } else {
    res.status(400).send({message: 'Worker does not exist.'})
  }
})
router.post('/import-complete', function(req, res) {
  log('client import complete', req.body)
  res.send('Thanks!')
})

module.exports = router