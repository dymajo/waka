import * as bodyParser from 'body-parser'
import Express from 'express'
import 'source-map-support/register'
import WakaOrchestrator from '.'
import ConfigManager from './configManager'
import logger from './logger'


const start = async () => {
  const app = Express()
  app.use(bodyParser.json())
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'waka-orchestrator')
    next()
  })

  const configManager = new ConfigManager()
  const config = await configManager.getConfig()
  const orchestrator = new WakaOrchestrator(config)
  app.use(orchestrator.router)

  const listener = app.listen(config.port, async () => {
    const addr = listener.address()
    const bind = typeof addr === 'string' ? addr : addr ? addr.port : 9001
    if (typeof bind === 'number') {
      logger.info({ port: bind }, 'waka-orchestrator listening')
      await orchestrator.start(bind)
    }
  })
}
start()
