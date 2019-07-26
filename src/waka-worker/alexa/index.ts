import * as Logger from 'bunyan'
import { Float } from 'mssql'
import { Response } from 'express'
import Connection from '../db/connection'
import { WakaRequest } from '../../typings'

class Alexa {
  logger: Logger
  connection: Connection
  prefix: string
  constructor(props: {
    logger: Logger
    connection: Connection
    prefix: string
  }) {
    this.logger = props.logger
    this.connection = props.connection
    this.prefix = props.prefix
  }

  listStops = async (req: WakaRequest<null, null>, res: Response) => {
    const sqlRequest = this.connection.get().request()
    sqlRequest.input('lat', Float, req.query.lat)
    sqlRequest.input('lon', Float, req.query.lon)
    sqlRequest.input('distance', Float, req.query.distance)
    const result = await sqlRequest.query<{
      stop_name: string
      route_type: number
      stop_code: string
      distance: number
    }>(`
    DECLARE @CurrentLocation geography;
    SET @CurrentLocation = geography ::Point(@lat, @lon, 4326)

    SELECT DISTINCT
      stop_name,
      route_type,
      stop_code,
      ROUND(geo_location.STDistance(@CurrentLocation), 0) AS distance
    FROM stops
    JOIN stop_times
      ON stop_times.stop_id = stops.stop_id
    JOIN trips
      ON trips.trip_id = stop_times.trip_id
    JOIN routes
      ON routes.route_id = trips.route_id
    WHERE geo_location.STDistance(@CurrentLocation) <= @distance
    AND route_type <> 712
    ORDER BY distance
    `)

    res.send(result.recordset)
  }
}

export default Alexa
