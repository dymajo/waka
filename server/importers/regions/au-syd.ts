import config from '../../config'
import MultiImporter from '../MultiImporter'
import connection from '../../db/connection'
import log from '../../logger'

const locations = [
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/ferries',
    type: 'ferry',
    name: 'ferries',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/innerwest',
    type: 'lightrail',
    name: 'innerwestlr',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle',
    type: 'lightrail',
    name: 'newcastlelr',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/nswtrains',
    type: 'train',
    name: 'nswtrains',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains',
    type: 'train',
    name: 'sydneytrains',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/metro',
    type: 'metro',
    name: 'metro',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC001',
    type: 'bus',
    name: 'SMBSC001',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC002',
    type: 'bus',
    name: 'SMBSC002',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC003',
    type: 'bus',
    name: 'SMBSC003',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC004',
    type: 'bus',
    name: 'SMBSC004',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC005',
    type: 'bus',
    name: 'SMBSC005',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SBSC006',
    type: 'bus',
    name: 'SBSC006',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC007',
    type: 'bus',
    name: 'SMBSC007',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC008',
    type: 'bus',
    name: 'SMBSC008',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC009',
    type: 'bus',
    name: 'SMBSC009',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC010',
    type: 'bus',
    name: 'SMBSC010',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC012',
    type: 'bus',
    name: 'SMBSC012',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC013',
    type: 'bus',
    name: 'SMBSC013',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC014',
    type: 'bus',
    name: 'SMBSC014',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC015',
    type: 'bus',
    name: 'SMBSC015',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC001',
    type: 'bus',
    name: 'OSMBSC001',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC002',
    type: 'bus',
    name: 'OSMBSC002',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC003',
    type: 'bus',
    name: 'OSMBSC003',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC004',
    type: 'bus',
    name: 'OSMBSC004',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC006',
    type: 'bus',
    name: 'OSMBSC006',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC007',
    type: 'bus',
    name: 'OSMBSC007',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC008',
    type: 'bus',
    name: 'OSMBSC008',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC009',
    type: 'bus',
    name: 'OSMBSC009',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC010',
    type: 'bus',
    name: 'OSMBSC010',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC011',
    type: 'bus',
    name: 'OSMBSC011',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC012',
    type: 'bus',
    name: 'OSMBSC012',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/NISC001',
    type: 'bus',
    name: 'NISC001',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/ECR109',
    type: 'bus',
    name: 'ECR109',
  },
]

class SydneyImporter extends MultiImporter {
  constructor() {
    super({
      authorization: config.tfnswApiKey,
      batchSize: 6,
      downloadInterval: 2000,
      locations,
    })
  }

  async postImport() {
    const sqlRequest = await connection.get().request()
    await sqlRequest.query(`
    delete from routes where route_id = 'RTTA_DEF' or route_id = 'RTTA_REV';
    delete from trips where route_id = 'RTTA_DEF' or route_id = 'RTTA_REV';
    `)
    log(
      `${config.prefix} ${config.version}`,
      'Post Import: deleted non-revenue services',
    )
  }
}

export default SydneyImporter
