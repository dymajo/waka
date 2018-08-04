const httpProxy = require('http-proxy')
const router = require('express').Router()
const log = require('../server-common/logger.js')

const Static = require('./static.js')
const WorkerManager = require('./workerManager.js')

const proxy = httpProxy.createProxyServer({
  ignorePath: true,
})
const proxyHandle = function(req, res) {
  const prefix =
    req.params.prefix === 'auto'
      ? WorkerManager.getPrefix(req.query.lat, req.query.lon)
      : req.params.prefix

  const port = WorkerManager.getMapping(prefix)

  if (port === 404 || prefix === '') {
    res.status(404).send({
      message: `prefix ${prefix} not found`,
      url: req.originalUrl,
    })
  } else {
    const url = req.originalUrl.split('/a/' + req.params.prefix)[1]
    proxy.web(req, res, { target: 'http://127.0.0.1:' + port + '/a' + url })
  }
}
log('Starting Static Server')
const staticServer = new Static()
staticServer.start()
router.all('/', staticServer.route)
router.all('/a/email', staticServer.route)

/**
 * @api {get} /regions Get Available Regions
 * @apiName GetRegions
 * @apiGroup Info
 *
 * @apiSuccess {Object} region Object of available regions
 * @apiSuccess {String} region.prefix Region Prefix
 * @apiSuccess {String} region.name Name of the Region
 * @apiSuccess {String} region.secondaryName Extra Region Name (State, Country etc)
 * @apiSuccess {Array} region.initialLocation Lat, Lon array of location that map should go to when selected in the UI
 * @apiSuccess {Bool} region.showInCityList Whether this region should be visible in the UI
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "nz-akl": {
 *         "prefix": "nz-akl",
 *         "name": "Tāmaki Makaurau",
 *         "secondaryName": "Auckland",
 *         "initialLocation": [-36.844229, 174.767823],
 *         "showInCityList": true,
 *       },
 *       "nz-syd": {
 *         "prefix": "nz-chc",
 *         "name": "Sydney",
 *         "secondaryName": "New South Wales",
 *         "initialLocation": [-43.534658, 172.637573],
 *         "showInCityList": false,
 *       }
 *     }
 *
 */
router.get('/a/regions', (req, res) => {
  res.send(WorkerManager.getAllRegions())
})
router.all('/a/:prefix', proxyHandle)
router.all('/a/:prefix/*', proxyHandle)
router.all('/a/*', proxyHandle)
router.all('/a', (req, res) => {
  res.send({
    message: 'the waka api docs are located at /docs/index.html',
  })
})
router.all('/*', staticServer.route)

module.exports = router
