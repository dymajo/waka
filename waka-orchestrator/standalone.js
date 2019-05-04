const Express = require('express')
const bodyParser = require('body-parser')
const AWSXRay = require('aws-xray-sdk')
const logger = require('./logger.js')

AWSXRay.setLogger(logger)
AWSXRay.config([AWSXRay.plugins.ECSPlugin])
AWSXRay.captureHTTPsGlobal(require('http'))

const ConfigManager = require('./configManager.js')
const WakaOrchestrator = require('./index.js')

const start = async () => {
  const app = new Express()
  app.use(
    AWSXRay.express.openSegment(
      `waka-orchestrator${process.env.XRAY_SUFFIX || ''}`
    )
  )
  app.use(bodyParser.json())
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'waka-orchestrator')
    next()
  })

  const configManager = new ConfigManager()
  const config = await configManager.getConfig()
  const orchestrator = new WakaOrchestrator(config)
  app.use(orchestrator.router)
  app.use(AWSXRay.express.closeSegment())

  const listener = app.listen(config.port, () => {
    logger.info(
      { port: listener.address().port },
      'waka-orchestrator listening'
    )
    orchestrator.start()
  })
}
start()
