import * as sql from 'mssql'
import Connection from '../db/connection'

interface DataAccessProps {
  connection: Connection
}

class DataAccess {
  connection: Connection
  constructor(props: DataAccessProps) {
    const { connection } = props
    this.connection = connection
  }

  getRoutes = async (noTrains = false) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    let excludeTrains = ``
    if (noTrains) {
      excludeTrains = 'and route_type <> 2'
    }
    const data = await sqlRequest.query<{
      route_short_name: string
      route_long_name: string
      agency_id: string
      route_type: number
      route_color: string
      route_desc: string
      route_id: string
    }>(`
      SELECT route_short_name,
        route_long_name,
        agency_id,
        route_type,
        route_color,
        route_desc,
        route_id
      FROM routes
      WHERE route_type <> 712 and route_desc <> 'School Buses' ${excludeTrains}
      ORDER BY
        route_type,
        dbo.fn_CreateAlphanumericSortValue(route_short_name, 0);
    `)
    return data
  }

  getTrainRoutes = async () => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query<{
      route_short_name: string
      route_long_name: string
      agency_id: string
      route_type: number
      route_color: string
      route_desc: string
      route_id: string
      direction_id: number
    }>(`
      select DISTINCT
        r.route_id,
        t.direction_id,
        r.route_long_name,
        r.route_short_name,
        r.agency_id,
        r.route_type,
        r. route_color,
        r.route_desc
      from routes r
      inner join trips t
      on t.route_id = r.route_id
      where route_type = '2'
      order by route_id
    `)
    return data
  }

  getOperator = async (route: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('route_short_name', sql.VarChar(50), route)
    const data = await sqlRequest.query<{ agency_id: string }>(
      `
      SELECT top(1)
        agency_id
      FROM routes
      WHERE
        route_short_name = @route_short_name
    `
    )
    return data
  }

  getColors = async (route: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('route_short_name', sql.VarChar(50), route)
    const data = await sqlRequest.query<{ route_color: string }>(`
    SELECT top(1)
      route_color
    FROM routes
    WHERE
      route_short_name = @route_short_name
    `)
    return data
  }

  getRouteInfo = async (route: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('route_short_name', sql.VarChar(50), route)
    const data = await sqlRequest.query<{
      route_short_name: string
      route_long_name: string
      agency_id: string
      route_id: string
      route_color: string
    }>(`
    select top(1)
    route_short_name, route_long_name, agency_id, route_id, route_color
    from routes
    where
    route_short_name = @route_short_name
    `)
    return data
  }
}
export default DataAccess
