const Express = require('express')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const EnvMapper = require('../envMapper.js')
const WakaWorker = require('./index.js')

dotenv.config()

const { PREFIX, VERSION, PORT } = process.env

const app = new Express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', `waka-worker-${PREFIX}-${VERSION}`)
  next()
})
const envMapper = new EnvMapper()
const config = envMapper.fromEnvironmental(process.env)
const worker = new WakaWorker(config)
app.use(`/a/${PREFIX}`, worker.router)
app.use(worker.router)

const listener = app.listen(PORT, () => {
  worker.logger.info({ port: listener.address().port }, 'waka-worker listening')
  worker.start()
})
