const httpProxy = require('http-proxy')
const router = require('express').Router()
const log = require('../server-common/logger.js')

const Static = require('./static.js')
const WorkerManager = require('./workerManager.js')

const proxy = httpProxy.createProxyServer({
  ignorePath: true
})
const proxyHandle = function(req, res) {
  let prefix = req.params.prefix
  if (req.params.prefix === 'auto') {
    if (req.query.lat < -40.6) {
      prefix = 'nz-wlg'
    }
    prefix = 'nz-akl'
  }

  const port = WorkerManager.getMapping(prefix)
  if (port === 404) {
    res.status(404).send({message: 'prefix not found'})
  } else {
    const url = req.originalUrl.split('/a/' + req.params.prefix)[1]
    proxy.web(req, res, { target: 'http://127.0.0.1:' + port + '/a' + url })
  }
}
log('Starting Static Server')
const staticServer = new Static()
staticServer.start()
router.all('/', staticServer.route)
router.all('/a/:prefix', proxyHandle)
router.all('/a/:prefix/*', proxyHandle)
router.all('/*', staticServer.route)

module.exports = router