import fetch from 'node-fetch'
import * as sql from 'mssql'
import * as Logger from 'bunyan'
import { Response } from 'express'
import doubleDeckers from './nz-akl-doubledecker.json'
import Connection from '../../db/connection'
import { BaseRealtime, RealtimeNZAKLProps, WakaRequest } from '../../../typings'

const schedulePullTimeout = 20000
const scheduleLocationPullTimeout = 15000

class RealtimeNZAKL extends BaseRealtime {
  apiKey: string
  lastUpdate: Date
  lastVehicleUpdate: Date

  currentData: any
  currentVehicleData: any

  currentDataFails: number
  currentVehicleDataFails: number

  tripUpdateTimeout: NodeJS.Timer
  locationTimeout: NodeJS.Timer

  tripUpdatesOptions: { url: string; headers: { [header: string]: string } }
  vehicleLocationsOptions: {
    url: string
    headers: { [header: string]: string }
  }
  connection: Connection
  logger: Logger
  constructor(props: RealtimeNZAKLProps) {
    super()
    const { logger, connection, apiKey } = props
    this.connection = connection
    this.logger = logger
    this.apiKey = apiKey

    this.lastUpdate = null
    this.lastVehicleUpdate = null
    this.currentData = {}
    this.currentDataFails = 0
    this.currentVehicleData = {}
    this.currentVehicleDataFails = null
    this.tripUpdateTimeout = 0
    this.locationTimeout = 0

    this.tripUpdatesOptions = {
      url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    }
    this.vehicleLocationsOptions = {
      url: 'https://api.at.govt.nz/v2/public/realtime/vehiclelocations',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    }
  }

  isDoubleDecker = (vehicle: string) => {
    return doubleDeckers.includes(vehicle)
  }

  isEV = (vehicle: string) => {
    return ['2840', '2841'].includes(vehicle)
  }

  start = () => {
    const { apiKey, logger } = this
    if (!apiKey) {
      logger.warn('No Auckland Transport API Key, will not show realtime.')
      return
    }
    this.schedulePull()
    this.scheduleLocationPull()
    logger.info('Auckland Realtime Started.')
  }

  stop = () => {
    clearTimeout(this.tripUpdateTimeout)
    clearTimeout(this.locationTimeout)
    this.logger.info('Auckland Realtime stopped.')
  }

  schedulePull = async () => {
    const { logger, tripUpdatesOptions } = this
    try {
      const data = await fetch(tripUpdatesOptions.url, {
        headers: tripUpdatesOptions.headers,
      }).then(r => r.json())
      if (data.response && data.response.entity) {
        const newData = {}
        data.response.entity.forEach(trip => {
          newData[trip.trip_update.trip.trip_id] = trip.trip_update
        })
        this.currentData = newData
        this.currentDataFails = 0
        this.lastUpdate = new Date()
        logger.info('Pulled AT Trip Updates Data.')
      } else {
        logger.warn({ response: data }, 'Could not get AT Data')
      }
    } catch (err) {
      this.currentDataFails += 1
      logger.warn({ err }, 'Could not get AT Data')
    }
    this.tripUpdateTimeout = setTimeout(this.schedulePull, schedulePullTimeout)
  }

  scheduleLocationPull = async () => {
    const { logger, vehicleLocationsOptions } = this
    try {
      const data = await fetch(vehicleLocationsOptions.url, {
        headers: vehicleLocationsOptions.headers,
      }).then(r => r.json())
      this.currentVehicleData = data.response
      this.currentDataFails = 0
      this.lastVehicleUpdate = new Date()
      logger.info('Pulled AT Location Data.')
    } catch (err) {
      this.currentVehicleDataFails += 1
      logger.error({ err }, 'Could not get AT Data')
    }
    this.locationTimeout = setTimeout(
      this.scheduleLocationPull,
      scheduleLocationPullTimeout
    )
  }

  getTripsEndpoint = async (
    req: WakaRequest<{ trips: string[]; train: boolean }, null>,
    res: Response
  ) => {
    // compat with old version of api
    if (req.body.trips.constructor !== Array) {
      req.body.trips = Object.keys(req.body.trips)
    }
    const { trips, train } = req.body

    // falls back to API if we're out of date
    const data =
      train || this.currentDataFails > 3
        ? await this.getTripsAuckland(trips, train)
        : this.getTripsCached(trips)
    return res.send(data)
  }

  getTripsAuckland = (trips: string[], train = false) => {
    const { logger, vehicleLocationsOptions, tripUpdatesOptions } = this
    const realtimeInfo = {}
    trips.forEach(trip => {
      realtimeInfo[trip] = {}
    })

    const opts = train ? vehicleLocationsOptions : tripUpdatesOptions

    try {
      const data = await fetch(`${opts.url}?tripid=${trips.join(',')}`, {
        headers: opts.headers,
      }).then(r => r.json())
      if (data.response && data.response.entity) {
        if (train) {
          data.response.entity.forEach(trip => {
            realtimeInfo[trip.vehicle.trip.trip_id] = {
              v_id: trip.vehicle.vehicle.id,
              latitude: trip.vehicle.position.latitude,
              longitude: trip.vehicle.position.longitude,
              bearing: trip.vehicle.position.bearing,
            }
          })
        } else {
          data.response.entity.forEach(trip => {
            const timeUpdate =
              trip.trip_update.stop_time_update.departure ||
              trip.trip_update.stop_time_update.arrival ||
              {}
            realtimeInfo[trip.trip_update.trip.trip_id] = {
              stop_sequence: trip.trip_update.stop_time_update.stop_sequence,
              delay: timeUpdate.delay,
              timestamp: timeUpdate.time,
              v_id: trip.trip_update.vehicle.id,
              double_decker: this.isDoubleDecker(trip.trip_update.vehicle.id),
              ev: this.isEV(trip.trip_update.vehicle.id),
            }
          })
        }
      }
    } catch (err) {
      logger.error({ err }, 'Could not get data from AT.')
    }
    return realtimeInfo
  }

  getTripsCached = (trips: string[]) => {
    // this is essentially the same function as above, but just pulls from cache
    const realtimeInfo: {
      [tripId: string]: {
        stop_sequence: number
        delay: number
        timestamp: number
        v_id: number
        double_decker: boolean
        ev: boolean
      }
    } = {}
    trips.forEach(trip => {
      const data = this.currentData[trip]
      if (typeof data !== 'undefined') {
        const timeUpdate =
          data.stop_time_update.departure || data.stop_time_update.arrival || {}
        realtimeInfo[trip] = {
          stop_sequence: data.stop_time_update.stop_sequence,
          delay: timeUpdate.delay,
          timestamp: timeUpdate.time,
          v_id: data.vehicle.id,
          double_decker: this.isDoubleDecker(data.vehicle.id),
          ev: this.isEV(data.vehicle.id),
        }
      }
    })

    return realtimeInfo
  }

  getVehicleLocationEndpoint = async (
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ) => {
    const { logger, vehicleLocationsOptions } = this
    const { trips } = req.body

    const vehicleInfo = {}
    req.body.trips.forEach(trip => {
      vehicleInfo[trip] = {}
    })
    try {
      const data = await fetch(
        `${vehicleLocationsOptions.url}?tripid=${trips.join(',')}`,
        {
          headers: vehicleLocationsOptions.headers,
        }
      ).then(r => r.json())
      if (data.response.entity) {
        data.response.entity.forEach(trip => {
          vehicleInfo[trip.vehicle.trip.trip_id] = {
            latitude: trip.vehicle.position.latitude,
            longitude: trip.vehicle.position.longitude,
            bearing: trip.vehicle.position.bearing,
          }
        })
      }
      return res.send(vehicleInfo)
    } catch (err) {
      logger.error({ err }, 'Could not get vehicle location from AT.')
      return res.send({ error: err })
    }
  }

  getLocationsForLine = async (
    req: WakaRequest<null, { line: string }>,
    res: Response
  ) => {
    const { logger, connection } = this
    const { line } = req.params
    if (this.currentVehicleData.entity === undefined) {
      return res.send([])
    }

    try {
      const sqlRouteIdRequest = connection.get().request()
      sqlRouteIdRequest.input('route_short_name', sql.VarChar(50), line)
      const routeIdResult = await sqlRouteIdRequest.query<{ route_id: string }>(
        `
        SELECT route_id
        FROM routes
        WHERE route_short_name = @route_short_name
        `
      )
      const routeIds = routeIdResult.recordset.map(r => r.route_id)
      const trips = this.currentVehicleData.entity.filter(entity =>
        routeIds.includes(entity.vehicle.trip.route_id)
      )
      // this is good enough because data comes from auckland transport
      const tripIds = trips.map(entity => entity.vehicle.trip.trip_id)
      const escapedTripIds = `'${tripIds.join('\', \'')}'`
      const sqlTripIdRequest = connection.get().request()
      const tripIdRequest = await sqlTripIdRequest.query<{
        trip_id: string
        direction_id: number
      }>(`
        SELECT *
        FROM trips
        WHERE trip_id IN (${escapedTripIds})
        `)

      const tripIdsMap = {}
      tripIdRequest.recordset.forEach(
        record => (tripIdsMap[record.trip_id] = record.direction_id)
      )

      // now we return the structued data finally
      const result = trips.map(entity => ({
        latitude: entity.vehicle.position.latitude,
        longitude: entity.vehicle.position.longitude,
        bearing: entity.vehicle.position.bearing
          ? parseInt(entity.vehicle.position.bearing, 10)
          : null,
        direction: tripIdsMap[entity.vehicle.trip.trip_id],
        updatedAt: this.lastVehicleUpdate,
      }))
      return res.send(result)
    } catch (err) {
      logger.error({ err }, 'Could not get locations from line.')
      return res.status(500).send(err)
    }
  }
}
export default RealtimeNZAKL
