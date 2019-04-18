const connection = require('../../db/connection.js')
const BaseImporter = require('./BaseImporter')
const log = require('../../logger.js')

class MetlinkImporter extends BaseImporter {
  constructor() {
    super()
    this.zipname = 'metlink'
    this.url =
      'https://www.metlink.org.nz/assets/Google_Transit/google-transit.zip'
  }

  async postImport() {
    const sqlRequest = connection.get().request()
    await sqlRequest.query(`
      UPDATE trips
      SET trips.trip_headsign = stop_times.stop_headsign
      FROM trips JOIN stop_times ON trips.trip_id = stop_times.trip_id
      WHERE stop_sequence = 0 and trips.trip_headsign is null
    `)
    log(
      `${global.config.prefix} ${global.config.version}`.magenta,
      'Post Import: Completed Trip Headsign Override'
    )
  }
}

module.exports = MetlinkImporter
