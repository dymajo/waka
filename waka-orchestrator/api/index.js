const path = require('path')
const express = require('express')
const logger = require('../logger.js')

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

    router.post('/mapping/set', async (req, res) => {
      const { versionManager } = this
      try {
        const { prefix, id } = req.body
        await versionManager.updateMapping(prefix, id)
        res.send({ message: 'Activated worker.' })
      } catch (err) {
        logger.error({ err }, 'Error mapping worker.')
        res.status(500).send(err)
      }
    })

    router.post('/mapping/delete', async (req, res) => {
      const { versionManager } = this
      try {
        const { prefix } = req.body
        await versionManager.deleteMapping(prefix)
        res.send({ message: 'Deleting mapping.' })
      } catch (err) {
        logger.error({ err }, 'Error unmapping worker.')
        res.status(500).send(err)
      }
    })

    router.use('/', express.static(path.join(__dirname, '/dist')))
  }
}
module.exports = PrivateApi
