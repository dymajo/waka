import config from '../../config'
import connection from '../../db/connection'
import logger from '../../logger'
import SingleImporter from '../SingleImporter'

const log = logger(config.prefix, config.version)

class AucklandImporter extends SingleImporter {
  constructor() {
    super({
      zipname: 'at',
      url: 'https://atcdn.blob.core.windows.net/data/gtfs.zip',
    })
    this.files = this.files.map((file) => {
      if (file.name !== 'agency.txt') {
        return { ...file, versioned: true }
      }
      return file
    })
  }

  postImport = async () => {
    const sqlRequest = connection.get().request()
    await sqlRequest.query(`
      UPDATE routes
      SET route_type = '712'
      WHERE route_short_name LIKE '0__' OR route_short_name LIKE '4__' OR (route_short_name LIKE '5__' and agency_id <> 'WBC') OR route_short_name = '220'
    `)
    log.info('Post Import: Updated Schools Routes to route_type 712')
  }
}

export default AucklandImporter
