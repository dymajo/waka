import { Router } from 'express'
import * as morgan from 'morgan'
import createLogger from './logger'
import cityMetadata from '../cityMetadata.json'
import Connection from './db/connection'
import Lines from './lines'
import Search from './stops/search'
import Station from './stops/station'
import StopsNZAKL from './stops/regions/nz-akl'
import StopsNZWLG from './stops/regions/nz-wlg'
import Realtime from './realtime'
import { WorkerConfig, Logger } from '../typings'
import BaseStops from '../types/BaseStops'

class WakaWorker {
  config: WorkerConfig
  logger: Logger
  connection: Connection
  router: Router
  realtime: Realtime
  stopsExtras: BaseStops
  search: Search
  lines: Lines
  station: Station

  bounds: {
    lat: { min: number; max: number }
    lon: { min: number; max: number }
  }

  constructor(config: WorkerConfig) {
    const {
      prefix,
      version,
      db,
      api,
      storageService,
      shapesContainer,
      shapesRegion,
      newRealtime,
    } = config

    this.config = config
    const logger = createLogger(prefix, version)
    this.logger = logger
    const connection = new Connection({ logger, db })
    this.connection = connection

    this.router = Router()
    this.realtime = new Realtime({
      logger,
      connection,
      prefix,
      api,
      newRealtime,
      redisConfig: config.redis,
    })

    this.stopsExtras = null
    if (prefix === 'nz-akl') {
      this.stopsExtras = new StopsNZAKL({ logger, apiKey: api['agenda-21'] })
    } else if (prefix === 'nz-wlg') {
      this.stopsExtras = new StopsNZWLG({ logger })
    }
    const { stopsExtras } = this

    this.search = new Search({ logger, connection, prefix, stopsExtras })
    this.lines = new Lines({
      logger,
      connection,
      prefix,
      version,
      search: this.search,
      config: {
        storageService,
        shapesContainer,
        shapesRegion,
      },
    })
    this.station = new Station({
      logger,
      connection,
      prefix,
      stopsExtras,
      lines: this.lines,
      realtimeTimes: this.realtime.getCachedTrips,
    })

    this.bounds = { lat: { min: 0, max: 0 }, lon: { min: 0, max: 0 } }

    this.bindRoutes()
  }

  start = async () => {
    await this.connection.open().catch(err => {
      this.logger.error(err)
    })
    this.logger.info('Connected to the Database')
    this.lines.start()
    this.search.start()
    if (this.stopsExtras) this.stopsExtras.start()
    this.realtime.start()

    this.bounds = await this.station.getBounds()
  }

  stop = () => {
    this.lines.stop()
    this.search.stop()
    if (this.stopsExtras) this.stopsExtras.stop()
    this.realtime.stop()
  }

  signature = () => {
    const { bounds, config } = this
    const { prefix, version } = config

    // the region may have multiple cities
    let city = cityMetadata[prefix]
    if (!Object.prototype.hasOwnProperty.call(city, 'name')) {
      city = city[prefix]
    }
    const { name, secondaryName, longName } = city
    return { prefix, version, bounds, name, secondaryName, longName }
  }

  bindRoutes = () => {
    const { lines, search, station, realtime, router } = this

    /**
     * @api {get} /:region/info Get worker info
     * @apiName GetInfo
     * @apiGroup Info
     *
     * @apiParam {String} region Region of Worker
     *
     * @apiSuccess {String} prefix Region Code.
     * @apiSuccess {String} version  Version of GTFS Schedule currently in use.
     * @apiSuccess {String} name Name of the Region
     * @apiSuccess {String} secondaryName Extra Region Name (State, Country etc)
     * @apiSuccess {String} longName The name and secondary name combined.
     * @apiSuccess {Object} bounds latlon Bound of stop data in region.
     * @apiSuccess {Object} bounds.lat Latitude Bounds
     * @apiSuccess {Number} bounds.lat.min Latitude Minimum Bound
     * @apiSuccess {Number} bounds.lat.max Latitude Minimum Bound
     * @apiSuccess {Object} bounds.lon Longitude Bounds
     * @apiSuccess {Number} bounds.lon.min Longitude Minimum Bound
     * @apiSuccess {Number} bounds.lon.max Longitude Minimum Bound
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       "prefix": "nz-akl",
     *       "version": "20180702170310_v67.28",
     *       "name": "Tāmaki Makaurau",
     *       "secondaryName": "Auckland",
     *       "longName": "Tāmaki Makaurau, Auckland",
     *       "bounds": {
     *         "lat": {
     *           "min": -37.39747,
     *           "max": -36.54297
     *         },
     *         "lon": {
     *           "min": 174.43058,
     *           "max": 175.09714
     *         }
     *       }
     *     }
     *
     */
    router.get('/ping', (req, res) => res.send('pong'))
    router.get('/info', (req, res) => res.send(this.signature()))

    router.get('/station', station.stopInfo)
    router.get('/station/search', search.getStopsLatLon)
    router.get('/station/:station', station.stopInfo)
    router.get('/station/:station/times', station.stopTimes)
    router.get('/station/:station/times/:time', station.stopTimes)
    router.get('/station/:station/times/:fast', station.stopTimes)
    router.get(
      '/station/:station/timetable/:route/:direction',
      station.timetable
    )
    router.get(
      '/station/:station/timetable/:route/:direction/:offset',
      station.timetable
    )
    router.get('/stations', search.all)

    router.get('/lines', lines.getLines)
    router.get('/line/:line', lines.getLine)
    router.get('/stops/trip/:tripId', lines.getStopsFromTrip)
    router.get('/stops/shape/:shapeId', lines.getStopsFromShape)
    router.get('/shapejson/:shapeId', lines.getShapeJSON)

    router.get('/realtime-healthcheck', realtime.healthcheck)
    // router.get('/realtime/all', realtime.all)
    router.get('/realtime/:line', realtime.vehicleLocationV2)
    router.post('/realtime', realtime.stopInfo)
    router.post('/vehicle_location', realtime.vehicleLocation)
    router.post('/service-alerts', realtime.serviceAlerts)
  }
}
export default WakaWorker
