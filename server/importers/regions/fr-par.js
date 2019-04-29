const BaseImporter = require('../BaseImporter')

class RATPImporter extends BaseImporter {
  constructor() {
    super({
      url: 'http://dataratp.download.opendatasoft.com/RATP_GTFS_FULL.zip',
      zipname: 'paris',
    })
  }
}

module.exports = RATPImporter
