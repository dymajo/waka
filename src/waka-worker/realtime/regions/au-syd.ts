// import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import axios from 'axios'
import * as protobuf from 'protobufjs'
import * as Logger from 'bunyan'
import { Response, Request } from 'express'
import { VarChar } from 'mssql'
import Connection from '../../db/connection'
import { pRateLimit } from 'p-ratelimit'
import {
  PositionFeedMessage,
  UpdateFeedMessage,
  TripUpdate,
  WakaRequest,
  PositionFeedEntity,
} from '../../../typings'
import BaseRealtime from '../../../types/BaseRealtime';

const schedulePullTimeout = 20000

const modes = [
  'buses',
  'ferries',
  'lightrail/innerwest',
  'lightrail/newcastle',
  'nswtrains',
  'sydneytrains',
  'metro',
]

interface RealtimeAUSYDProps {
  apiKey: string
  connection: Connection
  logger: Logger
}

class RealtimeAUSYD extends BaseRealtime {
  connection: Connection
  logger: Logger
  apiKey: string
  lastUpdate: Date
  lastVehicleUpdate: Date
  currentData: { [tripId: string]: TripUpdate }
  currentDataFails: number
  currentVehicleData: PositionFeedEntity[]
  currentVehicleDataFails: number
  tripUpdateOptions: { url: string; headers: { Authorization: any } }
  vehicleLocationOptions: { url: string; headers: { Authorization: any } }
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>;
  constructor(props: RealtimeAUSYDProps) {
    super()
    const { apiKey, connection, logger } = props
    this.connection = connection
    this.logger = logger
    this.apiKey = apiKey
    this.rateLimiter = pRateLimit({
      interval: 1000,
      rate: 5,
      concurrency: 5,
    })

    this.lastUpdate = null
    this.lastVehicleUpdate = null
    this.currentData = {}
    this.currentDataFails = 0
    this.currentVehicleData = []
    this.currentVehicleDataFails = null

    this.tripUpdateOptions = {
      url: 'https://api.transport.nsw.gov.au/v1/gtfs/realtime',
      headers: {
        Authorization: apiKey,
      },
    }

    this.vehicleLocationOptions = {
      url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos',
      headers: {
        Authorization: apiKey,
      },
    }

    this.schedulePull = this.schedulePull.bind(this)
    this.scheduleLocationPull = this.scheduleLocationPull.bind(this)
  }

  start() {
    const { apiKey, logger } = this
    if (!apiKey) {
      logger.warn('No TfNSW API Key, will not show realtime.')
    }
    this.schedulePull()
    this.scheduleLocationPull()
    logger.info('TfNSW Realtime Started.')
  }

  stop() {
    // TODO!
    this.logger.warn('Sydney Realtime Not Stopped! Not Implemented.')
  }

  async schedulePull() {
    const { logger, tripUpdateOptions } = this
    const newData: { [tripId: string]: TripUpdate } = {}
    const root = await protobuf.load('tfnsw-gtfs-realtime.proto')
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
    const results = await Promise.all(
      modes.map(async mode => {
        try {
          const res = await this.rateLimiter(() => axios.get(`${tripUpdateOptions.url}/${mode}`, {
            headers: tripUpdateOptions.headers,
            responseType: 'arraybuffer',
          }))
          const uInt8 = new Uint8Array(res.data)
          const _feed = FeedMessage.decode(uInt8) as unknown
          // const _feed = GtfsRealtimeBindings.FeedMessage.decode(res)
          const feed = _feed as UpdateFeedMessage

          // const feed = GtfsRealtimeBindings.TripUpdate.decode(buffer)

          feed.entity.forEach(trip => {
            if (trip.tripUpdate) {
              newData[trip.tripUpdate.trip.tripId] = trip.tripUpdate
            }
          })
        } catch (err) {
          // console.error(err)
          // logger.error(err)
        }
      })
    )

    this.currentData = newData
    this.currentDataFails = 0
    this.lastUpdate = new Date()
    setTimeout(this.schedulePull, schedulePullTimeout)
  }

  async scheduleLocationPull() {
    const { logger, vehicleLocationOptions } = this
    const root = await protobuf.load('tfnsw-gtfs-realtime.proto')
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
    let newVehicleData: PositionFeedEntity[] = []
    const results = await Promise.all(
      modes.map(async mode => {
        try {
          const res = await this.rateLimiter(() => axios.get(`${vehicleLocationOptions.url}/${mode}`, {
            headers: vehicleLocationOptions.headers,
            responseType: 'arraybuffer',
          }))
          const uInt8 = new Uint8Array(res.data)
          const _feed = FeedMessage.decode(uInt8) as unknown
          // const _feed = GtfsRealtimeBindings.FeedMessage.decode(res)
          const feed = _feed as PositionFeedMessage
          newVehicleData = newVehicleData.concat(feed.entity)
        } catch (err) {
          // console.error(err)
        }
      })
    )
    this.currentVehicleData = newVehicleData
    this.currentDataFails = 0
    this.lastVehicleUpdate = new Date()
  }

  async getTripsEndpoint(
    req: WakaRequest<{ trips: string[]; stop_id: string }, null>,
    res: Response
  ) {
    const { trips, stop_id } = req.body
    const realtimeInfo = {}
    for (const trip in trips) {
      if (Object.prototype.hasOwnProperty.call(trips, trip)) {
        try {
          const data = this.currentData[trip]
          if (data !== undefined) {
            const targetStop = data.stopTimeUpdate.find(
              stopUpdate => stopUpdate.stopId === stop_id
            )
            let currentStop = {
              stopSequence: -100, // starts off as "indeterminate"
            }

            // this array is ordered in the order of stops
            const currentTime = new Date()
            for (let i = 0; i < data.stopTimeUpdate.length; i++) {
              const stopUpdate = data.stopTimeUpdate[i]
              if (stopUpdate.departure) {
                // filters out stops that have already passed
                if (
                  new Date(
                    (stopUpdate.departure.time.toNumber() +
                      stopUpdate.departure.delay) *
                    1000
                  ) > currentTime
                ) {
                  if (
                    currentStop.stopSequence === -100 &&
                    stopUpdate.stopSequence !== 0
                  ) {
                    currentStop = stopUpdate
                  }
                  break
                }
                // keeps setting it until it finds the right one
                if (stopUpdate.stopSequence) {
                  currentStop = stopUpdate
                }
              }
            }

            // return values:
            // delay is added to the scheduled time to figure out the actual stop time
            // timestamp is epoch scheduled time (according to the GTFS-R API)
            // stop_sequence is the stop that the vechicle is currently at
            const info = {}
            Object.assign(
              info,
              { stop_sequence: currentStop.stopSequence },
              targetStop.departure && {
                delay: targetStop.departure.delay,
                timestamp: targetStop.departure.time.toNumber(),
              }
            )
            realtimeInfo[trip] = info
          }
        } catch (error) { }
      }
    }
    return res.send(realtimeInfo)
  }

  async getVehicleLocationEndpoint(
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ) {
    const { logger, currentVehicleData } = this
    const { trips } = req.body
    const vehicleInfo = {}
    for (const trip in trips) {
      if (Object.prototype.hasOwnProperty.call(trips, trip)) {
        const element = trips[trip]
        try {
          const data = currentVehicleData[trip]
          vehicleInfo[trip] = {
            latitude: data.vehicle.position.latitude,
            longitude: data.vehicle.position.longitude,
          }
        } catch (err) { }
      }
    }
    return res.send(vehicleInfo)
  }

  async getLocationsForLine(
    req: WakaRequest<null, { line: string }>,
    res: Response
  ) {
    const { logger, connection } = this
    const { line } = req.params
    if (this.currentVehicleData.length === 0) {
      return res.send([])
    }

    try {
      const sqlRouteIdRequest = connection.get().request()
      sqlRouteIdRequest.input('route_short_name', VarChar(50), line)
      const routeIdResult = await sqlRouteIdRequest.query<{ route_id: string }>(
        `
      SELECT route_id
      FROM routes
      WHERE route_short_name = @route_short_name or route_id = @route_short_name
      `
      )
      const routeIds = routeIdResult.recordset.map(r => r.route_id)
      const trips = this.currentVehicleData.filter(entity => {
        return routeIds.some(routeId => {
          return routeId === entity.vehicle.trip.routeId
        })
      })
      const tripIds = trips.map(entity => entity.vehicle.trip.tripId)
      const escapedTripIds = `'${tripIds.join("', '")}'`
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
        bearing: entity.vehicle.position.bearing,
        direction: tripIdsMap[entity.vehicle.trip.tripId],
        updatedAt: this.lastVehicleUpdate,
      }))
      return res.send(result)
    } catch (err) {
      logger.error({ err }, 'Could not get locations from line.')
      return res.status(500).send(err)
    }
  }

  async getAllVehicleLocations(req: WakaRequest<null, null>, res: Response) {
    const { buses, trains, lightrail, ferries } = req.query
    const { currentVehicleData, connection } = this
    if (currentVehicleData.length !== 0) {
      const tripIds = currentVehicleData.map(
        entity => entity.vehicle.trip.tripId
      )
      const escapedTripIds = `'${tripIds.join("', '")}'`
      try {
        const sqlTripIdRequest = connection.get().request()
        const tripIdRequest = await sqlTripIdRequest.query<{
          trip_id: string
          route_type: number
        }>(`
  select routes.route_type, trips.trip_id from trips join routes on trips.route_id = routes.route_id where trip_id in (${escapedTripIds})
  `)
        const routeTypes = tripIdRequest.recordset.map(res => ({
          trip_id: res.trip_id,
          route_type: res.route_type,
        }))
        const vehicleData = currentVehicleData
          .filter(entity => entity.vehicle.position)
          .map(entity => ({
            latitude: entity.vehicle.position.latitude,
            longitude: entity.vehicle.position.longitude,
            bearing: entity.vehicle.position.bearing,
            updatedAt: this.lastVehicleUpdate,
            trip_id: entity.vehicle.trip.tripId,
          }))
        const result: {
          route_type: number
          latitude: number
          longitude: number
          bearing: number
          updatedAt: Date
          trip_id: string
        }[] = []
        for (let i = 0; i < routeTypes.length; i++) {
          result.push({
            ...routeTypes[i],
            ...vehicleData.find(
              itmInner => itmInner.trip_id === routeTypes[i].trip_id
            ),
          })
        }

        result.filter(res => {
          switch (res.route_type) {
            case 1000:
              return ferries === 'true'
            case 400:
            case 401:
            case 2:
            case 100:
            case 106:
              return trains === 'true'
            case 900:
              return lightrail === 'true'
            case 700:
            case 712:
            case 714:
            case 3:
              return buses === 'true'
            default:
              return false
          }
        })
        return res.send(result)
      } catch (error) {
        //
      }
    } else {
      return res.sendStatus(400)
    }
  }
}

export default RealtimeAUSYD
