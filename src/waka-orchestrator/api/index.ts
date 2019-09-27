import { join } from 'path'
import { readFile } from 'fs'
import { Router, static as _static } from 'express'

import logger from '../logger'
import KeyvalueLocal from '../adaptors/keyvalueLocal'
import KeyvalueDynamo from '../adaptors/keyvalueDynamo'
import VersionManager from '../versionManager'
import { WakaConfig } from '../../typings'
import cityMetadataJSON from '../../cityMetadata.json'

interface PrivateApiProps {
  config: WakaConfig
  versionManager: VersionManager
}

class PrivateApi {
  versionManager: VersionManager
  router: Router
  meta: KeyvalueDynamo | KeyvalueLocal

  constructor(props: PrivateApiProps) {
    const { config, versionManager } = props
    this.versionManager = versionManager

    this.router = Router()
    this.bindRoutes()

    const kvPrefix = config.keyvaluePrefix
    if (config.keyvalue === 'dynamo') {
      this.meta = new KeyvalueDynamo({
        name: `${kvPrefix}-meta`,
        region: config.keyvalueRegion,
      })
    } else {
      this.meta = new KeyvalueLocal({ name: `${kvPrefix}-meta` })
    }
  }

  bindRoutes() {
    const { router } = this
    router.get('/prefixes', (req, res) => {
      return res.send(cityMetadataJSON)
    })
    router.get('/git', (req, res) => {
      readFile('v.txt', 'utf8', (err, data) => {
        const git = data.replace(/(<|>)/g, '')
        res.send(git)
      })
    })
    router.get('/worker', async (req, res) => {
      const { versionManager } = this
      try {
        const data = await versionManager.allVersions()
        const response = Object.keys(data).map(versionKey => {
          const versionData = data[versionKey]
          return {
            id: versionKey,
            prefix: versionData.prefix,
            status: versionData.status,
            version: versionData.version,
            dbname: versionData.db.database,
            newRealtime: versionData.newRealtime,
          }
        })
        res.send(response)
      } catch (err) {
        res.status(500).send(err)
      }
    })

    router.post('/worker/add', async (req, res) => {
      const { versionManager } = this
      const workerConfig = req.body as {
        prefix: string
        version: string
        shapesContainer: string
        shapesRegion: string
        dbconfig: string
        newRealtime: boolean
      }
      try {
        await versionManager.addVersion(workerConfig)
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

    router.post('/worker/recycle', async (req, res) => {
      const { versionManager } = this
      try {
        versionManager.recycleGateway(req.body.prefix)
        res.send({ message: 'Recycled worker.' })
      } catch (err) {
        logger.error({ err }, 'Error recycling app.')
        res.status(500).send(err)
      }
    })

    router.post('/worker/docker', async (req, res) => {
      const { versionManager } = this
      try {
        const command = await versionManager.getDockerCommand(req.body.id)
        res.send({ command })
      } catch (err) {
        logger.error({ err }, 'Error getting docker command')
        res.status(500).send(err)
      }
    })

    router.post('/worker/delete', async (req, res) => {
      const {
        body: { id },
      } = req
      try {
        await this.versionManager.deleteWorker(id)
        res.send({ message: 'Deleting worker.' })
      } catch (error) {
        logger.error({ error }, 'error deleting worker')
        res.status(500).send(error)
      }
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

    router.get('/config', async (req, res) => {
      try {
        const remoteConfig = await this.meta.get('config')
        const remoteConfigRealtime = await this.meta.get('config-realtime')
        res.send({ config: remoteConfig, configRealtime: remoteConfigRealtime })
      } catch (err) {
        logger.error({ err }, 'Error getting remote config')
        res.status(500).send(err)
      }
    })

    router.post('/config', async (req, res) => {
      try {
        if (req.body.config) {
          await this.meta.set('config', req.body.config)
        }
        if (req.body.configRealtime) {
          await this.meta.set('config-realtime', req.body.configRealtime)
        }
        res.send({ message: 'Saved config.' })
      } catch (err) {
        logger.error({ err }, 'Error saving config.')
        res.status(500).send(err)
      }
    })

    router.post('/orchestrator/kill', async (req, res) => {
      logger.info('Orchestrator killed by user.')
      await res.send({ message: 'sending SIGTERM' })
      process.exit()
    })

    router.use(
      _static(
        join(__dirname, '../../../', 'node_modules', 'waka-manager', 'build')
      )
    )
    router.get('/*', (req, res) =>
      res.sendFile(
        join(
          __dirname,
          '../../../',
          'node_modules',
          'waka-manager',
          'build',
          'index.html'
        )
      )
    )

    // router.use('/', _static(join(__dirname, '/dist')))
  }
}
export default PrivateApi
