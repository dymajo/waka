const akl = require('./nz-akl')
const wlg = require('./nz-wlg')

class Realtime {
  stopInfo(req, res) {
    if (!req.body.trips) {
      res.status(400).send({
        message: 'please send trips'
      })
      return
    }

    const prefix = req.params.prefix || 'nz-akl'
    if (prefix === 'nz-akl') {
      akl.getTripsEndpoint(req, res)
    } else if (prefix === 'nz-wlg') {
      wlg.getTripsEndpoint(req, res)
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  }
  vehicleLocation(req, res) {
    const prefix = req.params.prefix || 'nz-akl'
    if (prefix === 'nz-akl') {
      akl.getVehicleLocationEndpoint(req, res)
    } else if (prefix === 'nz-wlg') {
      wlg.getVehicleLocationEndpoint(req, res)
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  }
}
module.exports = Realtime