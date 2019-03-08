const fetch = require('node-fetch')
const sql = require('mssql')
const moment = require('moment-timezone')

const tripsUrl = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
const serviceLocation = 'https://www.metlink.org.nz/api/v1/ServiceLocation/'

class RealtimeNZWLG {
  constructor(props) {
    const { logger, connection } = props
    this.connection = connection
    this.logger = logger
  }

  start() {
    this.logger.info('Wellington Realtime Started.')
  }

  stop() {
    this.logger.info('Wellington Realtime Stopped.')
  }

  async getTripsEndpoint(req, res) {
    if (!req.body.stop_id) {
      return res.status(400).send({ message: 'stop_id required' })
    }
    try {
      const bodies = await Promise.all(
        req.body.stop_id
          .split('+')
          .slice(0, 3)
          .map(
            stop =>
              new Promise(async (resolve, reject) => {
                try {
                  const request = await fetch(tripsUrl + stop)
                  const data = await request.json()
                  data.station = stop
                  resolve(data)
                } catch (err) {
                  reject(err)
                }
              })
          )
      )
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
            parseInt(trip.route_short_name, 10) >= 50 &&
            parseInt(trip.route_short_name, 10) < 60
          ) {
            trip.route_short_name = parseInt(
              trip.route_short_name,
              10
            ).toString()
          }

          if (
            trip.route_short_name in realtimeServices &&
            realtimeServices[trip.route_short_name].length > 0
          ) {
            const closest = realtimeServices[trip.route_short_name].reduce(
              (prev, curr) =>
                Math.abs(new Date(curr.AimedDeparture) - goal) <
                Math.abs(new Date(prev.AimedDeparture) - goal)
                  ? curr
                  : prev
            )

            // less than 180 seconds, then it's valid?
            if (Math.abs(new Date(closest.AimedDeparture) - goal) < 180000) {
              responseData[key] = {
                goal,
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
      return responseData
    } catch (err) {
      return res.status(400).send({ message: 'stop_id not found' })
    }
  }

  async getVehicleLocationEndpoint(req, res) {
    const { logger, connection } = this
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
      let routeName = result.recordset[0].route_short_name
      // 050 bus fix.
      if (parseInt(routeName, 10) >= 50 && parseInt(routeName, 10) < 60) {
        routeName = parseInt(routeName, 10).toString()
      }

      const responseData = {}
      const request = await fetch(`${serviceLocation}${routeName}`)
      const data = await request.json()
      data.Services.filter(service => {
        const dbdir = result.recordset[0].direction_id
        const rtdir = service.Direction
        return (
          (dbdir === 0 && rtdir === 'Outbound') ||
          (dbdir === 1 && rtdir === 'Inbound')
        )
      }).forEach(service => {
        responseData[service.VehicleRef] = {
          latitude: parseFloat(service.Lat),
          longitude: parseFloat(service.Long),
          bearing: service.Bearing,
        }
      })
      res.send(responseData)
      return responseData
    } catch (err) {
      logger.error(err)
      res.status(500).send({ message: 'error' })
      return err
    }
  }

  async getLocationsForLine(req, res) {
    const { logger } = this
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
      logger.error(err)
      res.status(500).send({ message: 'Bad Request' })
    }
  }
}
module.exports = RealtimeNZWLG
