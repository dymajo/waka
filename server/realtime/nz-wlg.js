const request = require('request')
const connection = require('../db/connection.js')
const cache = require('../cache')
const sql = require('mssql')

const tripsUrl = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
const serviceLocation = 'https://www.metlink.org.nz/api/v1/ServiceLocation/'

const realtime = {
  getTripsEndpoint: function(req, res) {
    if (!req.body.stop_id) {
      return res.status(400).send({message: 'stop_id required'})
    }
    request({url: tripsUrl + req.body.stop_id}, function(err, response, body) {
      if (err || response.statusCode === 400) {
        return res.status(400).send({message: 'stop_id not found'})
      }

      body = JSON.parse(body)
      // reduces things into a nice map
      const realtimeServices = {}
      body.Services.filter(item => item.IsRealtime).forEach(item => {
        const serviceId = item.Service.TrimmedCode
        if (!(serviceId in realtimeServices)) {
          realtimeServices[serviceId] = []
        }
        realtimeServices[serviceId].push(item)
      })

      const responseData = {}
      const misses = {}
      Object.keys(req.body.trips).forEach((key) => {
        const trip = req.body.trips[key]
        const goal = new Date()
        goal.setHours(0)
        goal.setMinutes(0)
        goal.setSeconds(0)
        goal.setMilliseconds(0)
        goal.setSeconds(trip.departure_time_seconds)

        if (trip.route_short_name in realtimeServices && realtimeServices[trip.route_short_name].length > 0) {
          const closest = realtimeServices[trip.route_short_name].reduce((prev, curr) => {
            return (Math.abs(new Date(curr.AimedDeparture) - goal)) < Math.abs(new Date(prev.AimedDeparture) - goal) ? curr : prev
          })

          // less than 180 seconds, then it's valid?
          if (Math.abs(new Date(closest.AimedDeparture) - goal) < 180000) {
            responseData[key] = {
              goal: goal,
              found: new Date(closest.AimedDeparture),
              delay: (new Date(closest.ExpectedDeparture) - goal) / 1000,
              v_id: closest.VehicleRef,
              stop_sequence: -100,
              time: 0,
              double_decker: false,
            }
            realtimeServices[trip.route_short_name].splice(realtimeServices[trip.route_short_name].indexOf(closest), 1)
          } else if (goal < new Date()) {
            responseData[key] = {
              departed: 'probably'
            }
          } else {
            responseData[key] = {
              departed: 'unlikely'
            }
          }
        }
      })
      responseData.extraServices = realtimeServices
      res.send(responseData)
    })
  },
  getVehicleLocationEndpoint: function(req, res) {
    const trip_id = req.body.trips[0]

    const prefix = 'nz-wlg'
    const sqlRequest = connection.get().request()
    sqlRequest.input('prefix', sql.VarChar(50), prefix)
    sqlRequest.input('version', sql.VarChar(50), cache.currentVersion(prefix))
    sqlRequest.input('trip_id', sql.VarChar(50), trip_id)
    sqlRequest.query(`
      SELECT TOP 1
        route_short_name
      FROM trips 
      INNER JOIN routes ON
        routes.prefix = trips.prefix and
        routes.version = trips.version and 
        routes.route_id = trips.route_id
      WHERE
        trips.prefix = @prefix
        and trips.version = @version
        and trip_id = @trip_id
    `).then(result => {
      const route_name = result.recordset[0].route_short_name
      request({url: serviceLocation + route_name}, function(err, response, body) {
        const responseData = {}
        JSON.parse(body).Services.forEach(service => {
          responseData[service.VehicleRef] = {
            latitude: service.Lat,
            longitude: service.Long,
            bearing: service.Bearing
          }
        })
        res.send(responseData)
      })
    }).catch(err => {
      console.error(err)
      res.status(500).send({message: 'error'})
    })
  }
}
module.exports = realtime 