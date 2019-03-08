const Express = require('express')
const WakaOrchestrator = require('./index.js')
const logger = require('./logger.js')

const app = new Express()
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'waka-orchestrator')
  next()
})
const port = process.env.PORT || 9001
const orchestrator = new WakaOrchestrator({
  gateway: 'local',
  keyvalue: 'local',
  port,
})
app.use(orchestrator.router)

const listener = app.listen(port, () => {
  logger.info({ port: listener.address().port }, 'waka-orchestrator listening')
  orchestrator.start()
})
