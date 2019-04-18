const BaseImporter = require('../BaseImporter')

class ChchImporter extends BaseImporter {
  constructor() {
    super({
      zipname: 'metro-christchurch',
      url: 'http://metroinfo.co.nz/Documents/gtfs.zip',
    })
  }
}
module.exports = ChchImporter
