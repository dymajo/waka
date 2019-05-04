const Express = require('express')
const AWSXRay = require('aws-xray-sdk')
const logger = require('./logger.js')

AWSXRay.setLogger(logger)
AWSXRay.config([AWSXRay.plugins.ECSPlugin])
AWSXRay.captureHTTPsGlobal(require('http'))

const WakaProxy = require('./index.js')

const app = new Express()
app.use(
  AWSXRay.express.openSegment(`waka-proxy${process.env.XRAY_SUFFIX || ''}`)
)
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'waka-proxy')
  next()
})
const endpoint = process.env.ENDPOINT || 'https://waka.app/a'
const proxy = new WakaProxy({ endpoint })
app.use('/a', proxy.router)
app.use(proxy.router)

const listener = app.listen(process.env.PORT || 9001, () => {
  logger.info(
    { port: listener.address().port, endpoint },
    'waka-proxy listening'
  )
  proxy.start()
})

app.use(AWSXRay.express.closeSegment())
