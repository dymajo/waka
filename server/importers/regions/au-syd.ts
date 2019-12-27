import config from '../../config'
import logger from '../../logger'
import MultiImporter from '../MultiImporter'

const locations = [
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/ferries/sydneyferries',
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
    name: 'SMBSC001_Busways_Western_Sydney',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC002',
    type: 'bus',
    name: 'SMBSC002_Interline_Bus_Services',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC003',
    type: 'bus',
    name: 'SMBSC003_Transit_Systems',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC004',
    type: 'bus',
    name: 'SMBSC004_Hillsbus',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC005',
    type: 'bus',
    name: 'SMBSC005_Punchbowl_Bus_Company',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SBSC006',
    type: 'bus',
    name: 'SMBSC006_Transit_Systems',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC007',
    type: 'bus',
    name: 'SMBSC007_State_Transit_Sydney',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC008',
    type: 'bus',
    name: 'SMBSC008_State_Transit_Sydney',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC009',
    type: 'bus',
    name: 'SMBSC009_State_Transit_Sydney',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC010',
    type: 'bus',
    name: 'SMBSC010_Transdev_NSW',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC012',
    type: 'bus',
    name: 'SMBSC012_Transdev_NSW',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC013',
    type: 'bus',
    name: 'SMBSC013_Transdev_NSW',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC014',
    type: 'bus',
    name: 'SMBSC014_Forest_Coach_Lines',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC015',
    type: 'bus',
    name: 'SMBSC015_Busabout',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC001',
    type: 'bus',
    name: 'OSMBSC001_Rover_Coaches',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC002',
    type: 'bus',
    name: 'OSMBSC002_Hunter_Valley_Buses',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC003',
    type: 'bus',
    name: 'OSMBSC003_Port_Stephens_Coaches',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC004',
    type: 'bus',
    name: 'OSMBSC004_Hunter_Valley_Buses',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC006',
    type: 'bus',
    name: 'OSMBSC006_Busways_Central_Coast',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC007',
    type: 'bus',
    name: 'OSMBSC007_Red_Bus_Service',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC008',
    type: 'bus',
    name: 'OSMBSC008_Blue_Mountains_Transit',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC009',
    type: 'bus',
    name: 'OSMBSC009_Premier_Charters',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC010',
    type: 'bus',
    name: 'OSMBSC010_Premier_Illawarra',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC011',
    type: 'bus',
    name: 'OSMBSC011_Coastal_Liner',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC012',
    type: 'bus',
    name: 'OSMBSC012_Dions_Bus_Service',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/NISC001',
    type: 'bus',
    name: 'NISC001_Newcastle_Transport_Buses',
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

  // postImport = async () => {
  //   const sqlRequest = await connection.get().request()
  //   await sqlRequest.query(`
  //   delete from routes where route_id = 'RTTA_DEF' or route_id = 'RTTA_REV';
  //   delete from trips where route_id = 'RTTA_DEF' or route_id = 'RTTA_REV';
  //   `)
  //   log.info(
  //     `${config.prefix} ${config.version}`,
  //     'Post Import: deleted non-revenue services',
  //   )
  // }
}

export default SydneyImporter
