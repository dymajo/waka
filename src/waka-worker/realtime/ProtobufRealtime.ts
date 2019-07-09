import protobuf from 'protobufjs'
import axios from 'axios'
import { Response, Request } from 'express'
import BaseRealtime from '../../types/BaseRealtime'
import {
  TripUpdate,
  UpdateFeedMessage,
  PositionFeedMessage,
  PositionFeedEntity,
  WakaRequest,
  Logger,
} from '../../typings'
import Connection from '../db/connection'

interface ProtobufRealtimeProps {
  logger: Logger
  connection: Connection
  tripUpdateOptions: { url: string; headers?: any }
  vehicleLocationOptions: { url: string; headers?: any }
}

abstract class ProtobufRealtime extends BaseRealtime {
  currentUpdateData: { [tripId: string]: TripUpdate }
  currentVehicleData: PositionFeedEntity[]
  constructor(props: ProtobufRealtimeProps) {
    super()
    const {
      connection,
      logger,
      tripUpdateOptions,
      vehicleLocationOptions,
    } = props
    this.connection = connection
    this.logger = logger
    this.tripUpdateOptions = tripUpdateOptions

    this.vehicleLocationOptions = vehicleLocationOptions
    this.scheduleUpdatePullTimeout = 15000
    this.scheduleLocationPullTimeout = 15000
  }

  start = () => {
    const { logger } = this
    this.scheduleUpdatePull()
    this.scheduleLocationPull()
    logger.info('Realtime Started.')
  }
  stop = () => {
    // TODO!
    this.logger.warn('Realtime Not Stopped! Not Implemented.')
  }

  scheduleUpdatePull = async () => {
    const { logger, tripUpdateOptions } = this
    const root = await protobuf.load('tfnsw-gtfs-realtime.proto')

    const FeedMessage = root.lookupType('transit_realtime.FeedMessage')

    try {
      const res = await axios.get(tripUpdateOptions.url, {
        headers: tripUpdateOptions.headers,
        responseType: 'arraybuffer',
      })
      const uInt8 = new Uint8Array(res.data)

      const feed = (FeedMessage.decode(uInt8) as unknown) as UpdateFeedMessage

      const newData: { [tripId: string]: TripUpdate } = {}
      feed.entity.forEach(trip => {
        const tripId = trip.tripUpdate
          ? trip.tripUpdate.trip.tripId
          : trip.vehicle
          ? trip.vehicle.trip.tripId
          : null
        newData[tripId] = trip.tripUpdate
      })

      this.currentUpdateData = newData
      this.currentUpdateDataFails = 0
      this.lastTripUpdate = new Date()
      logger.info('Pulled AT Trip Updates Data.')
    } catch (err) {
      this.currentUpdateDataFails += 1
      logger.warn({ err }, 'Could not get AT Data')
    }
    this.tripUpdateTimeout = setTimeout(
      this.scheduleUpdatePull,
      this.scheduleUpdatePullTimeout
    )
  }

  scheduleLocationPull = async () => {
    const { logger, vehicleLocationOptions } = this
    const root = await protobuf.load('tfnsw-gtfs-realtime.proto')

    const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
    try {
      const res = await axios.get(vehicleLocationOptions.url, {
        headers: vehicleLocationOptions.headers,
        responseType: 'arraybuffer',
      })
      const uInt8 = new Uint8Array(res.data)
      const feed = (FeedMessage.decode(uInt8) as unknown) as PositionFeedMessage

      this.currentVehicleData = feed.entity
      this.currentUpdateDataFails = 0
      this.lastVehicleUpdate = new Date()
      logger.info('Pulled AT Location Data.')
    } catch (err) {
      this.currentVehicleDataFails += 1
      logger.error({ err }, 'Could not get AT Data')
    }
    this.vehicleTimeout = setTimeout(
      this.scheduleLocationPull,
      this.scheduleLocationPullTimeout
    )
  }

  getTripsEndpoint = async (
    req: WakaRequest<{ trips: string[]; stop_id: string }, null>,
    res: Response
  ) => {
    const { trips, stop_id } = req.body
    const realtimeInfo = {}
    for (const trip in trips) {
      if (Object.prototype.hasOwnProperty.call(trips, trip)) {
        try {
          const data = this.currentUpdateData[trip]
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
        } catch (error) {
          console.log(error)
        }
      }
    }
    return res.send(realtimeInfo)
  }

  getVehicleLocationEndpoint = async (
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ) => {
    const { logger, currentVehicleData } = this
    const { trips } = req.body
    const vehicleInfo: {
      [tripId: string]: { latitude: number; longitude: number }
    } = {}
    for (const trip of trips) {
      try {
        const data = currentVehicleData.find(
          entity => entity.vehicle.trip.tripId === trip
        )
        if (data) {
          vehicleInfo[trip] = {
            latitude: data.vehicle.position.latitude,
            longitude: data.vehicle.position.longitude,
          }
        }
      } catch (err) {
        console.log(err)
      }
    }
    return res.send(vehicleInfo)
  }
}

export default ProtobufRealtime
