import { Router, Request, Response } from 'express'

import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import path from 'path'
import proxy from 'express-http-proxy'
import fs from 'fs'

import logger from './logger'
import GatewayLocal from './adaptors/gatewayLocal'
import GatewayEcs from './adaptors/gatewayEcs'
import UpdateManager from './updaters'
import VersionManager from './versionManager'
import PrivateApi from './api'
import { WakaConfig, BaseGateway } from '../typings'

const proxyPort = '9002'

class WakaOrchestrator {
  config: WakaConfig
  router: Router
  gateway: BaseGateway
  versionManager: VersionManager
  privateApi: PrivateApi
  updateManager: UpdateManager
  proxy: ChildProcessWithoutNullStreams

  constructor(config: WakaConfig) {
    const { gateway } = config
    this.config = config

    this.router = Router()
    if (gateway === 'local') {
      this.gateway = new GatewayLocal()
    } else if (gateway === 'ecs') {
      this.gateway = new GatewayEcs(config.gatewayConfig.ecs)
    } else if (gateway === 'kubernetes') {
      // this.gateway = new GatewayKubernetes(config.gatewayConfig.kubernetes)
    }
    const versionManager = new VersionManager({ config, gateway: this.gateway })
    this.versionManager = versionManager
    this.privateApi = new PrivateApi({ config, versionManager })
    this.updateManager = new UpdateManager({ config, versionManager })

    this.bindRoutes()
  }

  start(port) {
    const { config } = this
    this.versionManager.start()
    this.updateManager.start()

    if (config.gateway === 'local') {
      const binaryPath = path.join(
        __dirname,
        '../waka-go-proxy/waka-go-proxy.exe'
      )
      const goLogs = (d: Buffer) => {
        const dString = d.toString()
        try {
          const data = JSON.parse(dString)
          const { msg } = data
          data.name = 'waka-go-proxy'
          delete data.msg
          delete data.level
          delete data.time
          logger.info(data, msg)
        } catch (error) {
          // logger.info(dString)
        }
      }

      try {
        fs.statSync(binaryPath)
        this.proxy = spawn(binaryPath, [
          '-e',
          `http://localhost:${port}`,
          '-p',
          proxyPort,
          '-f',
          path.join(__dirname, '../cityMetadata.json'),
          '--pathprefix',
          '/a',
        ])

        this.proxy.stdout.on('data', goLogs)
        this.proxy.stderr.on('data', goLogs)
        this.proxy.on('close', d =>
          logger.info({ code: d.toString() }, 'proxy exited')
        )
      } catch (err) {
        logger.error(
          'proxy could not start - make sure you compile with `npm run build:proxy`. some routes will not work'
        )
      }
    }
  }

  bindRoutes() {
    const { gateway, router, privateApi, config } = this
    router.get('/', (req: Request, res: Response) => res.redirect('/private'))
    router.get('/ping', (req: Request, res: Response) => res.send('pong'))
    router.use('/private', privateApi.router)

    if (config.gateway === 'local') {
      router.use(gateway.router)
      router.use(
        proxy(`localhost:${proxyPort}/a/`, {
          proxyReqPathResolver: req => `/a${req.url}`,
        })
      )
    } else {
      router.get('/', (req: Request, res: Response) => res.redirect('/private'))
    }
  }
}
export default WakaOrchestrator
