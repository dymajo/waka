const colors = require('colors')
const log = require('../server-common/logger.js')
const router = require('express').Router()
const WorkerManager = require('./workerManager.js')

// tells worker to go and download shit
router.post('/import-start/:mode', function(req, res) {
  const body = req.body
  const worker = WorkerManager.getWorker(WorkerManager.getPort(body.prefix, body.version))
  let force = false
  if (req.query.force) {
    force = true
  }
  if (worker) {
    worker.import(req.params.mode, force).then(() => {
      res.send({message: 'Import Started.'})
    }).catch(err => {
      res.status(400).send(err)
    })
  } else {
    res.status(400).send({message: 'Worker does not exist.'})
  }
})
router.post('/import-complete', function(req, res) {
  const body = req.body
  const worker = WorkerManager.getWorker(WorkerManager.getPort(body.prefix, body.version))
  log(req.body.prefix.magenta, req.body.version.magenta, 'Client Import Complete')
  res.send('Thanks!')
  worker.complete()
})
router.get('/worker', function(req, res) {
  const data = WorkerManager.getAll()
  res.send(data)
})
router.post('/worker/add', function(req, res) {
  WorkerManager.add(req.body).then(() => {
    res.send('Added worker.')
  })
})
router.post('/worker/load', function(req, res) {
  WorkerManager.load().then(() => {
    res.send('Loaded workers')
  })
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
router.post('/worker/delete', function(req, res) {
  WorkerManager.delete(req.body.prefix, req.body.version).then(() => {
    res.send('Deleted Worker.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})
router.get('/mapping', function(req, res) {
  res.send(WorkerManager.getAllMappings())
})
router.post('/mapping/load', function(req, res) {
  WorkerManager.loadMappings().then(() => {
    res.send('Loaded mappings.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})
router.post('/mapping/set', function(req, res) {
  WorkerManager.setMapping(req.body.prefix, req.body.version).then(() => {
    res.send('Mapped Worker.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})
router.post('/mapping/delete', function(req, res) {
  WorkerManager.deleteMapping(req.body.prefix).then(() => {
    res.send('Deleted mapping.')
  }).catch((err) => {
    res.status(500).send(err)
  })
})

module.exports = router