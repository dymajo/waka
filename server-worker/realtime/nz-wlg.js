const request = require('request')
const fetch = require('node-fetch')
const sql = require('mssql')
const moment = require('moment-timezone')
const connection = require('../db/connection.js')
const cache = require('../cache')

const tripsUrl = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
const serviceLocation = 'https://www.metlink.org.nz/api/v1/ServiceLocation/'

const realtime = {
  getTripsEndpoint: (req, res) => {
    if (!req.body.stop_id) {
      return res.status(400).send({ message: 'stop_id required' })
    }
    Promise.all(
      req.body.stop_id
        .split('+')
        .slice(0, 3)
        .map(stop => {
          return new Promise((resolve, reject) => {
            request({ url: tripsUrl + stop }, function(err, response, body) {
              if (err) {
                return reject(err)
              }
              body = JSON.parse(body)
              body.station = stop
              resolve(body)
            })
          })
        })
    )
      .then(bodies => {
        const responseData = {
          extraServices: {},
        }
        bodies.forEach(body => {
          const stop = body.station
          const realtimeServices = {}
          body.Services.filter(item => item.IsRealtime).forEach(item => {
            const serviceId = item.Service.TrimmedCode
            if (!(serviceId in realtimeServices)) {
              realtimeServices[serviceId] = []
            }
            realtimeServices[serviceId].push(item)
          })

          Object.keys(req.body.trips).forEach(key => {
            const trip = req.body.trips[key]
            if (trip.station !== stop) {
              return
            }

            const goal = moment().tz('Pacific/Auckland')
            goal.hours(0)
            goal.minutes(0)
            goal.seconds(0)
            goal.milliseconds(0)
            goal.seconds(trip.departure_time_seconds)

            // 050 bus fix.
            if (
              parseInt(trip.route_short_name) >= 50 &&
              parseInt(trip.route_short_name) < 60
            ) {
              trip.route_short_name = parseInt(trip.route_short_name).toString()
            }

            if (
              trip.route_short_name in realtimeServices &&
              realtimeServices[trip.route_short_name].length > 0
            ) {
              const closest = realtimeServices[trip.route_short_name].reduce(
                (prev, curr) => {
                  return Math.abs(new Date(curr.AimedDeparture) - goal) <
                    Math.abs(new Date(prev.AimedDeparture) - goal)
                    ? curr
                    : prev
                }
              )

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
                realtimeServices[trip.route_short_name].splice(
                  realtimeServices[trip.route_short_name].indexOf(closest),
                  1
                )
              } else if (goal < new Date()) {
                responseData[key] = {
                  departed: 'probably',
                }
              } else {
                responseData[key] = {
                  departed: 'unlikely',
                }
              }
            }
          })
          responseData.extraServices[stop] = realtimeServices
        })
        res.send(responseData)
      })
      .catch(err => {
        return res.status(400).send({ message: 'stop_id not found' })
      })
  },

  getVehicleLocationEndpoint: async (req, res) => {
    const tripId = req.body.trips[0]

    const sqlRequest = connection.get().request()
    sqlRequest.input('trip_id', sql.VarChar(50), tripId)
    try {
      const result = await sqlRequest.query(
        `
      SELECT TOP 1
        route_short_name, direction_id
      FROM trips 
      INNER JOIN routes ON
        routes.route_id = trips.route_id
      WHERE
        trip_id = @trip_id
    `
      )
      if (result.recordset.length < 1) {
        return res.send({})
      }
      let route_name = result.recordset[0].route_short_name
      // 050 bus fix.
      if (parseInt(route_name) >= 50 && parseInt(route_name) < 60) {
        route_name = parseInt(route_name).toString()
      }

      request({ url: serviceLocation + route_name }, function(
        err,
        response,
        body
      ) {
        const responseData = {}
        JSON.parse(body)
          .Services.filter(service => {
            const dbdir = result.recordset[0].direction_id
            const rtdir = service.Direction
            return (
              (dbdir === 0 && rtdir === 'Outbound') ||
              (dbdir === 1 && rtdir === 'Inbound')
            )
          })
          .forEach(service => {
            responseData[service.VehicleRef] = {
              latitude: parseFloat(service.Lat),
              longitude: parseFloat(service.Long),
              bearing: service.Bearing,
            }
          })
        res.send(responseData)
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({ message: 'error' })
    }
  },
  getLocationsForLine: async (req, res) => {
    const { line } = req.params
    try {
      const metlinkData = await fetch(`${serviceLocation}${line}`).then(r =>
        r.json()
      )
      const responseData = metlinkData.Services.map(service => ({
        latitude: parseFloat(service.Lat),
        longitude: parseFloat(service.Long),
        bearing: parseInt(service.Bearing, 10),
        direction: service.Direction === 'Inbound' ? 1 : 0,
        updatedAt: new Date(service.RecordedAtTime),
      }))
      res.send(responseData)
    } catch (err) {
      console.log(err)
      res.status(500).send({ message: 'Bad Request' })
    }
  },
}
module.exports = realtime
