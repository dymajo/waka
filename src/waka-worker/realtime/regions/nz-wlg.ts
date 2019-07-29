import fetch from 'node-fetch'
import sql from 'mssql'
import momenttz from 'moment-timezone'
import moment from 'moment'
import * as Logger from 'bunyan'
import { Response } from 'express'
import {
  WakaRequest,
  MetlinkService,
  MetlinkUpdate,
  MetlinkStop,
  MetlinkNotice,
} from '../../../typings'
import Connection from '../../db/connection'
import BaseRealtime from '../../../types/BaseRealtime'

const tripsUrl = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
const serviceLocation = 'https://www.metlink.org.nz/api/v1/ServiceLocation/'

interface RealtimeNZWLGProps {
  connection: Connection
  logger: Logger
}

class RealtimeNZWLG extends BaseRealtime {
  connection: Connection
  logger: Logger
  constructor(props: RealtimeNZWLGProps) {
    super()
    const { logger, connection } = props
    this.connection = connection
    this.logger = logger
  }

  start = async () => {
    this.logger.info('Wellington Realtime Started.')
  }

  stop = () => {
    this.logger.info('Wellington Realtime Stopped.')
  }

  getTripsEndpoint = async (
    req: WakaRequest<{ stop_id: string; trips: string[] }, null>,
    res: Response
  ) => {
    if (!req.body.stop_id) {
      return res.status(400).send({ message: 'stop_id required' })
    }
    try {
      const bodies = await Promise.all<{
        LastModified: string
        Stop: MetlinkStop
        Notices: MetlinkNotice[]
        Services: MetlinkUpdate[]
        station: string
      }>(
        req.body.stop_id
          .split('+')
          .slice(0, 3)
          .map(
            (stop: string) =>
              new Promise<{
                LastModified: string
                Stop: MetlinkStop
                Notices: MetlinkNotice[]
                Services: MetlinkUpdate[]
                station: string
              }>(async (resolve, reject) => {
                try {
                  const request = await fetch(tripsUrl + stop)
                  const data: {
                    LastModified: string
                    Stop: MetlinkStop
                    Notices: MetlinkNotice[]
                    Services: MetlinkUpdate[]
                    station: string
                  } = await request.json()
                  data.station = stop
                  resolve(data)
                } catch (err) {
                  reject(err)
                }
              })
          )
      )
      const responseData: {} = {
        extraServices: {},
      }
      bodies.forEach(body => {
        const stop = body.station
        const realtimeServices: { [serviceId: string]: MetlinkUpdate[] } = {}
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

          const goal = momenttz().tz('Pacific/Auckland')
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
                Math.abs(moment(curr.AimedDeparture).unix() - goal.unix()) <
                Math.abs(moment(prev.AimedDeparture).unix() - goal.unix())
                  ? curr
                  : prev
            )

            // less than 180 seconds, then it's valid?
            if (
              Math.abs(moment(closest.AimedDeparture).unix() - goal.unix()) <
              180000
            ) {
              responseData[key] = {
                goal,
                found: moment(closest.AimedDeparture),
                delay: moment(closest.ExpectedDeparture).unix() - goal.unix(),
                v_id: closest.VehicleRef,
                stop_sequence: -100,
                time: 0,
                double_decker: false,
              }
              realtimeServices[trip.route_short_name].splice(
                realtimeServices[trip.route_short_name].indexOf(closest),
                1
              )
            } else if (goal < moment()) {
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
      return res.send(responseData)
    } catch (err) {
      return res.status(400).send({ message: 'stop_id not found' })
    }
  }

  getVehicleLocationEndpoint = async (
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ) => {
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

      const responseData: {
        [VehicleRef: string]: {
          latitude: number
          longitude: number
          bearing: string
        }
      } = {}
      const request = await fetch(`${serviceLocation}${routeName}`)
      const data = (await request.json()) as {
        LastModified: string
        Services: MetlinkService[]
      }
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
      return res.send(responseData)
    } catch (err) {
      logger.error(err)
      return res.status(500).send({ message: 'error' })
    }
  }

  getLocationsForLine = async (
    req: WakaRequest<null, { line: string }>,
    res: Response
  ) => {
    const { logger } = this
    const { line } = req.params
    try {
      const metlinkData = (await fetch(`${serviceLocation}${line}`).then(r =>
        r.json()
      )) as {
        LastModified: string
        Services: MetlinkService[]
      }
      const responseData = metlinkData.Services.map(service => ({
        latitude: parseFloat(service.Lat),
        longitude: parseFloat(service.Long),
        bearing: parseInt(service.Bearing, 10),
        direction: service.Direction === 'Inbound' ? 1 : 0,
        updatedAt: moment(service.RecordedAtTime),
      }))
      return res.send(responseData)
    } catch (err) {
      logger.error(err)
      return res.status(500).send({ message: 'Bad Request' })
    }
  }
}
export default RealtimeNZWLG
