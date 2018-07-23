const httpProxy = require('http-proxy')
const router = require('express').Router()
const log = require('../server-common/logger.js')

const cityMetadata = require('../cityMetadata.json')
const Static = require('./static.js')
const WorkerManager = require('./workerManager.js')

const proxy = httpProxy.createProxyServer({
  ignorePath: true,
})
const proxyHandle = function(req, res) {
  let prefix = req.params.prefix
  if (req.params.prefix === 'auto') {
    if (parseFloat(req.query.lat) < -44.5) {
      prefix = 'nz-otg'
    } else if (parseFloat(req.query.lat) < -41.9) {
      prefix = 'nz-chc'
    } else if (parseFloat(req.query.lat) < -40.6) {
      prefix = 'nz-wlg'
    } else if (parseFloat(req.query.lon) < 159) {
      prefix = 'au-syd'
    } else {
      prefix = 'nz-akl'
    }
  }

  const port = WorkerManager.getMapping(prefix)
  if (port === 404 || prefix === '') {
    res.status(404).send({
      message: 'prefix not found',
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
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "nz-akl": {
 *         "prefix": "nz-akl",
 *         "name": "Tāmaki Makaurau",
 *         "secondaryName": "Auckland"
 *       },
 *       "nz-syd": {
 *         "prefix": "nz-chc",
 *         "name": "Sydney",
 *         "secondaryName": "New South Wales"
 *       }
 *     }
 *
 */
router.get('/a/regions', (req, res) => {
  const availableRegions = {}
  const allMappings = WorkerManager.getAllMappings()
  Object.keys(allMappings).forEach(region => {
    const regionPair = allMappings[region].split('|')
    if (
      regionPair[0] !== 'null' &&
      WorkerManager.getPort(regionPair[0], regionPair[1])
    ) {
      const meta = cityMetadata[region]
      availableRegions[region] = {
        prefix: region,
        name: meta.name,
        secondaryName: meta.secondaryName,
      }
    }
  })
  res.send(availableRegions)
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
