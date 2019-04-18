const BaseImporter = require('./BaseImporter')

class OtagoImporter extends BaseImporter {
  constructor() {
    super()
    this.url = 'https://www.orc.govt.nz/transit/google_transit.zip'
    this.zipname = 'otago'
  }
}

module.exports = OtagoImporter
