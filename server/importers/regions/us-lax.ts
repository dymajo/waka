import MultiImporter from '../MultiImporter'
import connection from '../../db/connection'
import config from '../../config'
import logger from '../../logger'

const log = logger(config.prefix, config.version)

class LosAngelesImporter extends MultiImporter {
  constructor() {
    super({
      locations: [
        // {
        //   endpoint:
        //     'https://gitlab.com/LACMTA/gtfs_bus/raw/master/gtfs_bus.zip',
        //   name: 'la-metro-bus',
        //   type: 'bus',
        // },
        // {
        //   endpoint:
        //     'https://gitlab.com/LACMTA/gtfs_rail/raw/master/gtfs_rail.zip',
        //   name: 'la-metro-rail',
        //   type: 'train',
        // },
        // {
        //   endpoint:
        //     'https://www.metrolinktrains.com/globalassets/about/gtfs/gtfs.zip',
        //   name: 'metrolink',
        //   type: 'train',
        // },
        {
          endpoint:
            'http://lacitydot.com/gtfs/administrator/gtfszip/ladotgtfs.zip',
          name: 'ladot',
          type: 'bus',
        },
      ],
    })
  }
  postImport = async () => {
    const sqlRequest = await connection.get().request()
    await sqlRequest.query(`
      update routes set agency_id = 'LACMTA' where agency_id is null and route_type = 3
    `)

    const sqlRequest2 = await connection.get().request()
    await sqlRequest2.query(`
      update routes set agency_id = 'LACMTA_Rail' where agency_id is null and (route_type = 2 or route_type = 1 or route_type = 0)
    `)
    log.info(
      `${config.prefix} ${config.version}`,
      'Post Import: Completed agency override',
    )
  }
}

export default LosAngelesImporter
