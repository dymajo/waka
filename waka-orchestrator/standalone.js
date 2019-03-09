const Express = require('express')
const dotenv = require('dotenv')
const WakaOrchestrator = require('./index.js')
const logger = require('./logger.js')

dotenv.config()

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
  api: {
    'nz-akl': process.env.atApiKey, // TODO
    'agenda-21': process.env.AGENDA21_API_KEY,
  },
})
app.use(orchestrator.router)

const listener = app.listen(port, () => {
  logger.info({ port: listener.address().port }, 'waka-orchestrator listening')
  orchestrator.start()
})
