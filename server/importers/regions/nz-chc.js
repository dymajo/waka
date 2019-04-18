const BaseImporter = require('./BaseImporter')

class ChchImporter extends BaseImporter {
  constructor() {
    super()
    this.zipname = 'metro-christchurch'
    this.url = 'http://metroinfo.co.nz/Documents/gtfs.zip'
  }
}
module.exports = ChchImporter
