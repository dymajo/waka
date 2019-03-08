class DataAccess {
  constructor(props) {
    const { connection } = props
    this.connection = connection
  }

  async getRoutes() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query(`
      SELECT
        route_short_name, route_long_name, agency_id, route_type, route_color
      FROM routes
      ORDER BY route_type, route_short_name
    `)
    return data
  }
}
module.exports = DataAccess
