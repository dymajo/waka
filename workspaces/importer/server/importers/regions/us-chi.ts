import config from '../../config'
import connection from '../../db/connection'
import logger from '../../logger'
import SingleImporter from '../SingleImporter'

const log = logger(config.prefix, config.version)

class ChicagoImporter extends SingleImporter {
  constructor() {
    super({
      url:
        'http://www.transitchicago.com/downloads/sch_data/google_transit.zip',
      zipname: 'cta',
    })
  }
  postImport = async () => {
    const sqlRequest = connection.get().request()
    await sqlRequest.query(`
    update routes
    set agency_id = (select top(1) agency_id from agency)
    where agency_id is null;
    `)
    log.info(
      `${config.prefix} ${config.version}`,
      'Post Import: Completed agency override',
    )
  }
}

export default ChicagoImporter
