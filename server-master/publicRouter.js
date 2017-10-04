const httpProxy = require('http-proxy')
const router = require('express').Router()

const log = require('../server-common/logger.js')
const WorkerManager = require('./workerManager.js')

const proxy = httpProxy.createProxyServer({
  ignorePath: true
})
const proxyHandle = function(req, res) {
  const port = WorkerManager.getMapping(req.params.prefix)
  if (port === 404) {
    res.status(404).send({message: 'prefix not found'})
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + port + '/a/' + req.params[0] })
  }
}
router.all('/a/:prefix', proxyHandle)
router.all('/a/:prefix/*', proxyHandle)

module.exports = router