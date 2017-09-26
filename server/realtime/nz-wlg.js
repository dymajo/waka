const request = require('request')

const tripsUrl = 'https://www.metlink.org.nz/api/v1/StopDepartures/'

const realtime = {
  getTripsEndpoint: function(req, res) {
    if (!req.body.stop_id) {
      return res.status(400).send({message: 'stop_id required'})
    }
    request({url: tripsUrl + req.body.stop_id}, function(err, response, body) {
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
    res.send({})
  }
}
module.exports = realtime 