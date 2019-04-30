const MultiImporter = require('../MultiImporter')

const locations = [
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC001',
    type: 'bus',
    name: 'tfnswbuses1',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC002',
    type: 'bus',
    name: 'tfnswbuses2',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC003',
    type: 'bus',
    name: 'tfnswbuses3',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC004',
    type: 'bus',
    name: 'tfnswbuses4',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC005',
    type: 'bus',
    name: 'tfnswbuses5',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SBSC006',
    type: 'bus',
    name: 'tfnswbuses6',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC007',
    type: 'bus',
    name: 'tfnswbuses7',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC008',
    type: 'bus',
    name: 'tfnswbuses8',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC009',
    type: 'bus',
    name: 'tfnswbuses9',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC010',
    type: 'bus',
    name: 'tfnswbuses10',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC012',
    type: 'bus',
    name: 'tfnswbuses11',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC013',
    type: 'bus',
    name: 'tfnswbuses12',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC014',
    type: 'bus',
    name: 'tfnswbuses13',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/SMBSC015',
    type: 'bus',
    name: 'tfnswbuses14',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC001',
    type: 'bus',
    name: 'tfnswbuses15',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC002',
    type: 'bus',
    name: 'tfnswbuses16',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC003',
    type: 'bus',
    name: 'tfnswbuses17',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC004',
    type: 'bus',
    name: 'tfnswbuses18',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC006',
    type: 'bus',
    name: 'tfnswbuses19',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC007',
    type: 'bus',
    name: 'tfnswbuses20',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC008',
    type: 'bus',
    name: 'tfnswbuses21',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC009',
    type: 'bus',
    name: 'tfnswbuses22',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC010',
    type: 'bus',
    name: 'tfnswbuses23',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC011',
    type: 'bus',
    name: 'tfnswbuses24',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/OSMBSC012',
    type: 'bus',
    name: 'tfnswbuses25',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/NISC001',
    type: 'bus',
    name: 'tfnswbuses26',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses/ECR109',
    type: 'bus',
    name: 'tfnswbuses27',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/ferries',
    type: 'ferry',
    name: 'tfnswferries',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/innerwest',
    type: 'lightrail',
    name: 'tfnswlightrail1',
  },
  {
    endpoint:
      'https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle',
    type: 'lightrail',
    name: 'tfnswlightrail2',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/nswtrains',
    type: 'train',
    name: 'tfnswtrains1',
  },
  {
    endpoint: 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains',
    type: 'train',
    name: 'tfnswtrains2',
  },
]

class TfNSWImporter extends MultiImporter {
  constructor() {
    super({ locations, downloadInterval: 2000, batchSize: 6 })
  }
}

module.exports = TfNSWImporter
