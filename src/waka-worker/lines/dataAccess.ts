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

  getRoutes = async () => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.execute<{
      route_short_name: string
      route_long_name: string
      agency_id: string
      route_type: number
      route_color: string
      route_desc: string
      route_id: string
    }>('GetRoutes')
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
}
export default DataAccess
