const MulitImporter = require('../MultiImporter')

class TCImporter extends MulitImporter {
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
