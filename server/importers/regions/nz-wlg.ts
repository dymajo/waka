import connection from '../../db/connection'
import log from '../../logger'
import config from '../../config'
import SingleImporter from '../SingleImporter'

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
    log(
      `${config.prefix} ${config.version}`,
      'Post Import: Completed Trip Headsign Override'
    )
  }
}

export default WellingtonImporter
