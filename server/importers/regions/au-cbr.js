const MultiImporter = require('../MultiImporter')

class TCImporter extends MultiImporter {
  constructor() {
    super({
      locations: [
        {
          endpoint:
            'https://www.transport.act.gov.au/googletransit/google_transit.zip',
          type: 'bus',
          name: 'cbrbuses',
        },
        {
          endpoint:
            'https://www.transport.act.gov.au/googletransit/google_transit_lr.zip',
          type: 'lightrail',
          name: 'cbrlightrail',
        },
      ],
    })
  }
}

module.exports = TCImporter
