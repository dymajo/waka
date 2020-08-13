import config from '../../config'
import connection from '../../db/connection'
import logger from '../../logger'
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

  postImport = async () => {
    const sqlRequest = connection.get().request()
    await sqlRequest.query(`
      UPDATE trips
      SET trips.trip_headsign = stop_times.stop_headsign
      FROM trips JOIN stop_times ON trips.trip_id = stop_times.trip_id
      WHERE stop_sequence = 0 and trips.trip_headsign is null;
    `)
    log.info('Post Import: Completed Trip Headsign Override')

    await sqlRequest.query(
      "UPDATE routes SET route_color = '333333' WHERE route_color = '000000'",
    )
    await sqlRequest.query(
      "UPDATE routes SET route_color = '41bada' WHERE agency_id = 'EBYW'",
    )
    await sqlRequest.query(
      "UPDATE routes SET route_color = 'e52f2b' WHERE route_short_name = 'HVL'",
    )
    await sqlRequest.query(
      "UPDATE routes SET route_color = '4f9734' WHERE route_short_name = 'JVL'",
    )
    await sqlRequest.query(
      "UPDATE routes SET route_color = 'f39c12' WHERE route_short_name = 'KPL'",
    )
    await sqlRequest.query(
      "UPDATE routes SET route_color = '21b4e3' WHERE route_short_name = 'MEL'",
    )
    await sqlRequest.query(
      "UPDATE routes SET route_color = 'e52f2b' WHERE route_short_name = 'WRL'",
    )
    await sqlRequest.query("UPDATE routes SET route_text_color = 'ffffff'")
    log.info('Post Import: Updated Colors')
  }
}

export default WellingtonImporter
