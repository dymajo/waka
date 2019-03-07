const express = require('express')
const WorkerDiscovery = require('./workerDiscovery.js')

class WakaProxy {
  constructor(props) {
    this.router = express.Router()
    this.discovery = new WorkerDiscovery({
      endpoint: props.endpoint,
    })

    this.smartRedirect = this.smartRedirect.bind(this)
    this.bindRoutes()
  }

  bindRoutes() {
    this.router.get('/regions', (req, res) => {
      res.send(this.discovery.getRegions())
    })
    this.router.all('/:prefix', this.smartRedirect)
    this.router.all('/:prefix/*', this.smartRedirect)
  }

  smartRedirect(req, res) {
    const { originalUrl, params, query } = req
    const { prefix } = params
    const { lat, lon } = query
    if (prefix === 'auto') {
      const region = this.discovery.getRegionByBounds(
        parseFloat(lat),
        parseFloat(lon)
      )
      const newUrl = `/${region}/${originalUrl.split('/auto')[1]}`
      res.redirect(newUrl)
    } else {
      res.status(404).send({
        message: `prefix ${prefix} not found`,
        url: req.originalUrl,
      })
    }
  }

  start() {
    this.discovery.start()
  }
}
module.exports = WakaProxy

/**
 * @api {get} /regions Get Available Regions
 * @apiName GetRegions
 * @apiGroup Info
 *
 * @apiSuccess {Object} region Object of available regions
 * @apiSuccess {String} region.prefix Region Prefix
 * @apiSuccess {String} region.name Name of the Region
 * @apiSuccess {String} region.secondaryName Extra Region Name (State, Country etc)
 * @apiSuccess {String} region.longName The name and secondary name combined.
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
 *         "longName": "Tāmaki Makaurau, Auckland",
 *         "initialLocation": [-36.844229, 174.767823],
 *         "showInCityList": true,
 *       },
 *       "nz-syd": {
 *         "prefix": "au-syd",
 *         "name": "Sydney",
 *         "secondaryName": "New South Wales",
 *         "longName": "Sydney, New South Wales",
 *         "initialLocation": [-43.534658, 172.637573],
 *         "showInCityList": false,
 *       }
 *     }
 *
 */
