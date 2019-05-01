const BaseImporter = require('../BaseImporter')

class OtagoImporter extends BaseImporter {
  constructor() {
    super({
      url: 'https://www.orc.govt.nz/transit/google_transit.zip',
      zipname: 'otago',
    })
  }
}

module.exports = OtagoImporter
