const BaseImporter = require('../BaseImporter')

class ATImporter extends BaseImporter {
  constructor() {
    super({
      zipname: 'at',
      url: 'https://atcdn.blob.core.windows.net/data/gtfs.zip',
    })
    this.files = this.files.map(file => {
      if (file.name !== 'agency.txt') {
        file.versioned = true
      }
      return file
    })
  }
}

module.exports = ATImporter
