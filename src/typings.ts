import Long from 'long'
import * as Logger from 'bunyan'
import { Request } from 'express'
import { config as SqlConfig } from 'mssql'

export interface WakaConfig {
  port: number
  gateway: string
  keyvalue: string
  keyvaluePrefix: string
  keyvalueRegion: string
  storageService: string
  connectionTimeout: number
  requestTimeout: number
  transactionLimit: number
  api: {
    [api: string]: string
  }
  db: {
    [dbConfig: string]: DBConfig
  }
  updaters: {
    [updater: string]: {
      delay: number
      prefix: string
      dbconfig: string
      interval: number
      shapesContainer: string
      type: string
      shapesRegion: string
      url: string
      extended: boolean
    }
  }
  gatewayConfig?: {
    ecs: EcsGatewayConfig
  }
}

export interface WorkerConfig {
  prefix: string
  version: string
  db: DBConfig
  api: { [api: string]: string }
  storageService: string
  shapesContainer: string
  shapesRegion: string
}

export interface EcsGatewayConfig {
  cluster: string
  region: string
  servicePrefix: string
  serviceSuffix: string
  replicas: number
}

export interface DBConfig extends SqlConfig {
  server: string
  user: string
  password: string
}

export interface EnvironmentConfig {
  PREFIX: string
  VERSION: string
  DB_DATABASE: string
  DB_USER: string
  DB_PASSWORD: string
  DB_SERVER: string
  DB_TRANSACTION_LIMIT: string
  DB_CONNECTION_TIMEOUT: string
  DB_REQUEST_TIMEOUT: string
  STORAGE_SERVICE: string
  SHAPES_CONTAINER: string
  SHAPES_REGION: string
  SHAPES_SKIP: string
}

export interface EnvironmentImporterConfig extends EnvironmentConfig {
  KEYVALUE: string
  KEYVALUE_VERSION_TABLE: string
  KEYVALUE_REGION: string
}

export interface EnvironmentWorkerConfig extends EnvironmentConfig {
  AT_API_KEY: string
  AGENDA21_API_KEY: string
}

export interface UpdateFeedMessage {
  entity: UpdateFeedEntity[]
  header: FeedHeader
}

export interface PositionFeedMessage {
  entity: PositionFeedEntity[]
  header: FeedHeader
}

export interface PositionFeedEntity {
  id: string
  vehicle: VehiclePosition
}

export interface UpdateFeedEntity {
  id: string
  tripUpdate: TripUpdate
}

export interface TripUpdate {
  stopTimeUpdate: StopTimeUpdate[]
  timestamp: Long
  trip: TripDescriptor
  vehicle: VehicleDescriptor
}

export interface StopTimeUpdate {
  departure: StopTimeEvent
  arrival: StopTimeEvent
  scheduleRelationship: number
  stopId: string
  stopSequence?: number
}

export interface StopTimeEvent {
  delay?: number
  time?: Long
}

export interface TripDescriptor {
  routeId: string
  scheduleRelationship: number
  startDate: string
  startTime: string
  tripId: string
}

export interface VehicleDescriptor {
  id: string
  label: string
  licensePlate: string
}

export interface FeedHeader {
  gtfsRealtimeversion: string
  incrementality: number
  timestamp: Long
}

export interface VehiclePosition {
  congestionLevel: number
  position: {
    latitude: number
    longitude: number
    bearing?: number
    speed?: number
    odometer?: number
  }
  stopId: string
  timestamp: Long
  trip: TripDescriptor
  vehicle: VehicleDescriptor
}

export interface TfNSWUpdaterProps {
  apiKey: string
  callback: any
  delay: number
  interval: number
}

export interface AklTimes {
  provider: string
  trips: undefined[]
  availableSpaces?: number
  maxSpaces?: number
  html?: string
}

export interface Version {
  db: { database: string; password: string; server: string; user: string }
  id: string
  prefix: string
  shapesContainer: string
  shapesRegion: string
  status: string
  version: string
}

export type WakaParams<T> = T
export type WakaBody<T> = T

export interface WakaRequest<WakaBody, WakaParams> extends Request {
  body: WakaBody
  params: WakaParams
}
export interface BasicUpdaterProps {
  prefix: string
  callback: any
  interval: number
  delay: number
  url: string
}

export interface ATUpdaterProps {
  apiKey: string
  callback: any
  delay: number
  interval: number
}

export interface StorageProps {
  backing?: 'aws' | 'local'
  endpoint?: string
  region?: string
  logger: Logger
}

export interface StopTime {
  trip_id: string
  pickup_type: number
  drop_off_type: number
  arrival_time: Date
  departure_time: Date
  stop_id: string
  stop_name: string
  trip_headsign: string
  route_short_name: string
  stop_sequence: number
}

export interface TripRow {
  trip_id: string
  start_time: Date
  row_number: number
  trip_headsign: string
}

export interface RouteInfo {
  route_short_name: string
  route_long_name: string
  route_desc: string
  route_type: number
  route_color: string
  route_text_color: string
}

export interface StopRouteType {
  [stop_id: string]: string
}

export interface Onzo {
  battery: number
  chargeVoltage: number
  createTime: number
  direction: number
  height: number
  iccid: string
  id: number
  isLock: number
  isScooter: number
  latitude: number
  locationMode: number
  lockType: number
  longitude: number
  lstatus: number
  mac: string
  modelNum: string
  producid: string
  psignal: number
  pstatus: number
  speed: number
  unlockedTimes: number
  updateTime: number
  voltage: number
}

export interface MetlinkService {
  RecordedAtTime: string
  VehicleRef: string
  ServiceID: string
  HasStarted: boolean
  DepartureTime: string
  OriginStopID: string
  OriginStopName: string
  DestinationStopID: string
  DestinationStopName: string
  Direction: string
  Bearing: string
  BehindSchedule: true
  VehicleFeature: string
  DelaySeconds: number
  Lat: string
  Long: string
  Service: {
    Code: string
    TrimmedCode: string
    Name: string
    Mode: string
    Link: string
  }
}

export interface MetlinkStop {
  Name: string
  Sms: string
  Farezone: string
  Lat: number
  Long: number
  LastModified: string
}

export interface MetlinkNotice {
  RecordedAtTime: string
  MonitoringRef: string
  LineRef: string
  DirectionRef: string
  LineNote: string
}

export interface MetlinkUpdate {
  ServiceID: string
  IsRealtime: boolean
  VehicleRef: string
  Direction: string
  OperatorRef: string
  OriginStopID: string
  OriginStopName: string
  DestinationStopID: string
  DestinationStopName: string
  AimedArrival: string
  AimedDeparture: string
  VehicleFeature: string
  DepartureStatus: string
  ExpectedDeparture: string
  DisplayDeparture: string
  DisplayDepartureSeconds: number
  Service: {
    Code: string
    TrimmedCode: string
    Name: string
    Mode: string
    Link: string
  }
}

export { Logger }

declare const process: {
  env: {
    PORT: string
    GATEWAY: string
    KEYVALUE: string
    KEYVALUE_PREFIX: string
    KEYVALUE_REGION: string
    STORAGE_SERVICE: 'aws' | 'local'
  }
}
