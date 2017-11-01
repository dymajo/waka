const cache = require('../cache')
const fs = require('fs')
const path = require('path')

class Realtime {
  constructor() {
    this.fn = null
    cache.preReady.push(() => {
      if (fs.existsSync(path.join(__dirname, './' + global.config.prefix + '.js'))) {
        this.fn = require('./' + global.config.prefix)
        
      }
    })
    this.stopInfo = this.stopInfo.bind(this)
    this.vehicleLocation = this.vehicleLocation.bind(this)
  }
  stopInfo(req, res) {
    if (!req.body.trips) {
      res.status(400).send({
        message: 'please send trips'
      })
      return
    }

    if (this.fn) {
      this.fn.getTripsEndpoint(req, res)
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  }
  vehicleLocation(req, res) {
    if (this.fn) {
      this.fn.getVehicleLocationEndpoint(req, res)
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  }
}
module.exports = Realtime