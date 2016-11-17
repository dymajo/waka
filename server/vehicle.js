var azure = require('azure-storage');
var tableSvc = azure.createTableService();

var vehicle = {
  vehicleDetails: function(agency, id) {
    let offset = 0
    // id's don't map one to one, so we have to transform
    if (agency === 'nzbgw' || agency === 'nzbwp' || agency === 'nzbml' || agency === 'nzbns') {
      agency = 'nzb'
      offset = 10000
    } else if (agency === 'rth') {
      offset = 21000
    } else if (agency === 'btl') {
      offset = 21000
    } else if (agency === 'ue') {
      offset = 23000
    } else if (agency === 'he') {
      offset = 24000
    } else if (agency === 'abexp') {
      offset = 25000
    } else if (agency === 'wbc') {
      offset = 32000
    }
    agency = agency.toUpperCase()
    let rowKey = parseInt(id, '16') - offset
    let promise = new Promise(function(resolve, reject) {
      // get the data
      tableSvc.retrieveEntity('vehicleList', agency, rowKey.toString(), function(err, result, response) {
        if (err) {
          reject(err)
        }
        resolve(result)
      })
    })
    return promise
  },
  getVehicle: function(req, res) {
    let v = req.params.vehicle.toLowerCase().split('-')
    if (v.length !== 2) {
      return res.status(400).send({
        'error': 'needs to be in format: agency-busid'
      })
    }
    vehicle.vehicleDetails(v[0], v[1]).then(function(details) {
      res.send({
        model: details.model._,
        reg: details.reg._
      })
    }).catch(function(err) {
      res.status(404).send(err)
    })
  }
}
module.exports = vehicle