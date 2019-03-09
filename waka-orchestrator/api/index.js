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

    router.get('/worker', async (req, res) => {
      const { versionManager } = this
      const data = await versionManager.allVersions()
      const response = Object.keys(data).map(versionKey => {
        const versionData = data[versionKey]
        return {
          id: versionKey,
          prefix: versionData.prefix,
          status: versionData.status,
          version: versionData.version,
          dbname: versionData.db.database,
        }
      })
      res.send(response)
    })

    router.post('/worker/add', async (req, res) => {
      const { versionManager } = this
      try {
        await versionManager.addVersion(req.body)
        res.send({ message: 'Added worker.' })
      } catch (err) {
        res.status(500).send(err)
      }
    })

    router.post('/worker/status/:status', async (req, res) => {
      const { versionManager } = this
      try {
        await versionManager.updateVersionStatus(req.body.id, req.params.status)
        res.send({ message: 'Updated Status' })
      } catch (err) {
        res.status(500).send(err)
      }
    })

    router.post('/worker/docker', async (req, res) => {
      const { versionManager } = this
      try {
        const command = await versionManager.getDockerCommand(req.body.id)
        res.send({ command })
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // TODO
    router.post('/worker/delete', (req, res) => {
      res.status(500).send({ message: 'Not implemented!' })
    })

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
