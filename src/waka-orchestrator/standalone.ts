import Express from 'express'
import * as bodyParser from 'body-parser'
import * as morgan from 'morgan'

import ConfigManager from './configManager'
import WakaOrchestrator from '.'
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
    logger.info(
      { port: listener.address().port },
      'waka-orchestrator listening'
    )
    await orchestrator.start(listener.address().port)
  })
}
start()

// process.on('unhandledRejection', error => {
//   console.log(error)
//   debugger
//   // process.exit(1)
// })
