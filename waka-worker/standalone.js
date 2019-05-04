const Express = require('express')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const AWSXRay = require('aws-xray-sdk')

AWSXRay.config([AWSXRay.plugins.ECSPlugin])
AWSXRay.captureHTTPsGlobal(require('http'))

const EnvMapper = require('../envMapper.js')
const WakaWorker = require('./index.js')

dotenv.config()

const { PREFIX, VERSION, PORT } = process.env

const envMapper = new EnvMapper()
const config = envMapper.fromEnvironmental(process.env)
const worker = new WakaWorker(config)
AWSXRay.setLogger(worker.logger)

const app = new Express()
app.use(
  AWSXRay.express.openSegment(
    `waka-worker-${PREFIX}-${VERSION}${process.env.XRAY_SUFFIX || ''}`
  )
)
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', `waka-worker-${PREFIX}-${VERSION}`)
  next()
})
app.use(`/a/${PREFIX}`, worker.router)
app.use(worker.router)
app.use(AWSXRay.express.closeSegment())

const listener = app.listen(PORT, () => {
  worker.logger.info({ port: listener.address().port }, 'waka-worker listening')
  worker.start()
})
