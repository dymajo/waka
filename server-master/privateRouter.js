const log = require('../server-common/logger.js')
const router = require('express').Router()
const WorkerManager = require('./workerManager.js')

// tells worker to go and download shit
router.post('/import-start/:mode', function(req, res) {
  const body = req.body
  const worker = WorkerManager.getWorker(WorkerManager.getPort(body.prefix, body.version))
  if (worker) {
    worker.import(req.params.mode)
    res.send({message: 'Import Started.'})
  } else {
    res.status(400).send({message: 'Worker does not exist.'})
  }
})
router.post('/import-complete', function(req, res) {
  log('client import complete', req.body)
  res.send('Thanks!')
})
router.post('/worker/add', function(req, res) {
  WorkerManager.add(req.body)
  res.send('Added worker.')
})
router.post('/worker/start', function(req, res) {
  WorkerManager.start(req.body.prefix, req.body.version).then(() => {
    res.send('Started Worker.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})
router.post('/worker/startall', function(req, res) {
  WorkerManager.startAll().then(() => {
    res.send('Started All Auto Workers.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})
router.post('/worker/stop', function(req, res) {
  WorkerManager.stop(req.body.prefix, req.body.version).then(() => {
    res.send('Stopped Worker.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})

module.exports = router