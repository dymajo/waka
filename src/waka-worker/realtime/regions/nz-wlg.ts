import axios from 'axios'
import * as Logger from 'bunyan'
import { Response } from 'express'
import moment from 'moment'
import momenttz from 'moment-timezone'
import sql from 'mssql'
import { DBStopTime, MetlinkNotice, MetlinkService, MetlinkStop, MetlinkUpdate, WakaRequest } from '../../../types'
import BaseRealtime from '../../../types/BaseRealtime'
import Connection from '../../db/connection'
import StopsDataAccess from '../../stops/dataAccess'

const tripsUrl = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
const serviceLocation = 'https://www.metlink.org.nz/api/v1/ServiceLocation/'

interface RealtimeNZWLGProps {
  connection: Connection
  logger: Logger
}

class RealtimeNZWLG extends BaseRealtime {
  connection: Connection
  logger: Logger
  dataAccess: StopsDataAccess

  constructor(props: RealtimeNZWLGProps) {
    super()
    const { logger, connection } = props
    this.connection = connection
    this.logger = logger

    this.dataAccess = new StopsDataAccess({ connection, prefix: 'nz-wlg' })
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
    const { stop_id } = req.body
    try {
      const bodies = await Promise.all<{
        LastModified: string
        Stop: MetlinkStop
        Notices: MetlinkNotice[]
        Services: MetlinkUpdate[]
        station: string
      }>(
        stop_id
          .split('+')
          .slice(0, 3)
          .map(async (stop: string) => {
            try {
              const res = await axios.get<{
                LastModified: string
                Stop: MetlinkStop
                Notices: MetlinkNotice[]
                Services: MetlinkUpdate[]
                station: string
              }>(tripsUrl + stop)
              const { data } = res
              data.station = stop
              return data
            } catch (err) {
              console.log(err)
            }
          })
      )

      // Stop Times Crap
      const time = moment().tz('Pacific/Auckland')
      const currentTime = new Date(
        Date.UTC(1970, 0, 1, time.hour(), time.minute())
      )
      const today = new Date(0)
      today.setUTCFullYear(time.year())
      today.setUTCMonth(time.month())
      today.setUTCDate(time.date())

      // midnight fix
      if (time.hour() < 5) {
        today.setTime(today.getTime() - 1000 * 60 * 60 * 24)
      }

      const trips: { [index: string]: DBStopTime } = {}
      try {
        let dbTrips: DBStopTime[] = []
        dbTrips = await this.dataAccess.getStopTimes(
          stop_id,
          currentTime,
          today,
          'GetStopTimes'
        )

        dbTrips.forEach(trip => (trips[trip.trip_id] = trip))
      } catch (err) {
        this.logger.error({ err }, 'Could not get stop times.')
        return res.status(500).send(err)
      }

      const responseData: {} = {}
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

        Object.values(req.body.trips).forEach(key => {
          const trip = trips[key]
          if (trip === undefined) {
            return
          }

          const goal = momenttz().tz('Pacific/Auckland')
          goal.hours(0)
          goal.minutes(0)
          goal.seconds(0)
          goal.milliseconds(0)
          goal.seconds(trip.new_departure_time)

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
            const closest = realtimeServices[
              trip.route_short_name
            ].reduce((prev, curr) =>
              Math.abs(moment(curr.AimedDeparture).unix() - goal.unix()) <
              Math.abs(moment(prev.AimedDeparture).unix() - goal.unix())
                ? curr
                : prev
            )

            // less than 240 seconds, then it's valid?
            if (
              Math.abs(moment(closest.AimedDeparture).unix() - goal.unix()) <
              240
            ) {
              const delay =
                moment(closest.ExpectedDeparture).unix() - goal.unix()
              responseData[key] = {
                trip: {
                  tripId: key,
                  startTime: moment(closest.AimedDeparture).format('HH:mm:ss'),
                  scheduleRelationship: 'SCHEDULED',
                  routeId: trip.route_id,
                },
                stopTimeUpdate: [
                  {
                    stopSequence: -100,
                    departure: {
                      delay,
                      time: moment(closest.ExpectedDeparture)
                        .unix()
                        .toString(),
                    },
                    stopId: stop_id,
                    scheduleRelationship: 'SCHEDULED',
                  },
                ],
                vehicle: {
                  id: closest.VehicleRef,
                },
                timestamp: moment(closest.ExpectedDeparture)
                  .unix()
                  .toString(),
                delay,
                stop_sequence: -100,
                specialVehicle: {
                  ev: false, // TODO: Wellington actually has two electric buses
                  dd: false, // TODO: Wellington actually has plenty of double deckers
                },
              }
              realtimeServices[trip.route_short_name].splice(
                realtimeServices[trip.route_short_name].indexOf(closest),
                1
              )
            }
          }
        })
      })
      return res.send(responseData)
    } catch (err) {
      console.error(err)
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
      const response = await axios.get<{
        LastModified: string
        Services: MetlinkService[]
      }>(`${serviceLocation}${routeName}`)
      const { data } = response
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
      const { data: metlinkData } = await axios.get<{
        LastModified: string
        Services: MetlinkService[]
      }>(`${serviceLocation}${line}`)
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
