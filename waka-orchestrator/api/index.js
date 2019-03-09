const path = require('path')
const express = require('express')

const { Router } = express

class PrivateApi {
  constructor(props) {
    const { versionManager } = props
    this.versionManager = versionManager

    this.router = new Router()
    this.bindRoutes()
  }

  bindRoutes() {
    const { router } = this
    // router.post('/import-start/:mode', (req, res) => {
    //   const body = req.body
    //   const worker = WorkerManager.getWorker(
    //     WorkerManager.getPort(body.prefix, body.version)
    //   )
    //   let force = false
    //   if (req.query.force) {
    //     force = true
    //   }
    //   if (worker) {
    //     worker
    //       .import(req.params.mode, force)
    //       .then(() => {
    //         res.send({ message: 'Import Started.' })
    //       })
    //       .catch(err => {
    //         res.status(400).send(err)
    //       })
    //   } else {
    //     res.status(400).send({ message: 'Worker does not exist.' })
    //   }
    // })
    // router.post('/import-complete', (req, res) => {
    //   const body = req.body
    //   const worker = WorkerManager.getWorker(
    //     WorkerManager.getPort(body.prefix, body.version)
    //   )
    //   log(
    //     req.body.prefix.magenta,
    //     req.body.version.magenta,
    //     'Client Import Complete'
    //   )
    //   res.send('Thanks!')
    //   worker.complete()
    // })
    router.get('/worker', async (req, res) => {
      const { versionManager } = this
      const data = await versionManager.allVersions()
      const response = Object.keys(data).map(versionKey => {
        const versionData = data[versionKey]
        return {
          id: versionKey,
          prefix: versionData.prefix,
          version: versionData.version,
          dbname: versionData.db.database,
        }
      })
      res.send(response)
    })
    // router.post('/worker/add', (req, res) => {
    //   WorkerManager.add(req.body).then(() => {
    //     res.send('Added worker.')
    //   })
    // })
    // router.post('/worker/load', (req, res) => {
    //   WorkerManager.load().then(() => {
    //     res.send('Loaded workers')
    //   })
    // })
    // router.post('/worker/start', (req, res) => {
    //   WorkerManager.start(req.body.prefix, req.body.version)
    //     .then(() => {
    //       res.send('Started Worker.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    // router.post('/worker/startall', (req, res) => {
    //   WorkerManager.startAll()
    //     .then(() => {
    //       res.send('Started All Auto Workers.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    // router.post('/worker/stop', (req, res) => {
    //   WorkerManager.stop(req.body.prefix, req.body.version)
    //     .then(() => {
    //       res.send('Stopped Worker.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    // router.post('/worker/delete', (req, res) => {
    //   WorkerManager.delete(req.body.prefix, req.body.version)
    //     .then(() => {
    //       res.send('Deleted Worker.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    router.get('/mapping', async (req, res) => {
      const { versionManager } = this
      const data = await versionManager.allMappings()
      res.send(data)
    })
    // router.post('/mapping/load', (req, res) => {
    //   WorkerManager.loadMappings()
    //     .then(() => {
    //       res.send('Loaded mappings.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    // router.post('/mapping/set', (req, res) => {
    //   WorkerManager.setMapping(req.body.prefix, req.body.version)
    //     .then(() => {
    //       res.send('Mapped Worker.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    // router.post('/mapping/delete', (req, res) => {
    //   WorkerManager.deleteMapping(req.body.prefix)
    //     .then(() => {
    //       res.send('Deleted mapping.')
    //     })
    //     .catch(err => {
    //       res.status(500).send(err)
    //     })
    // })
    router.use('/', express.static(path.join(__dirname, '/dist')))
  }
}
module.exports = PrivateApi
