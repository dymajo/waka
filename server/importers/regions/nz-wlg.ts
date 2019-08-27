import connection from '../../db/connection'
import logger from '../../logger'
import config from '../../config'
import SingleImporter from '../SingleImporter'

const log = logger(config.prefix, config.version)

class WellingtonImporter extends SingleImporter {
  constructor() {
    super({
      zipname: 'metlink',
      url:
        'https://www.metlink.org.nz/assets/Google_Transit/google-transit.zip',
    })
  }

  async postImport() {
    const sqlRequest = await connection.get().request()
    await sqlRequest.query(`
      UPDATE trips
      SET trips.trip_headsign = stop_times.stop_headsign
      FROM trips JOIN stop_times ON trips.trip_id = stop_times.trip_id
      WHERE stop_sequence = 0 and trips.trip_headsign is null
    `)
    log.info(
      `${config.prefix} ${config.version}`,
      'Post Import: Completed Trip Headsign Override',
    )
  }
}

export default WellingtonImporter
