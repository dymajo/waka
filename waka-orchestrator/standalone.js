const Express = require('express')
const bodyParser = require('body-parser')
const ConfigManager = require('./configManager.js')
const WakaOrchestrator = require('./index.js')
const logger = require('./logger.js')

const start = async () => {
  const app = new Express()
  app.use(bodyParser.json())
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'waka-orchestrator')
    next()
  })

  const configManager = new ConfigManager()
  const config = await configManager.getConfig()
  const orchestrator = new WakaOrchestrator(config)
  app.use(orchestrator.router)

  const listener = app.listen(config.port, () => {
    logger.info(
      { port: listener.address().port },
      'waka-orchestrator listening'
    )
    orchestrator.start()
  })
}
start()
