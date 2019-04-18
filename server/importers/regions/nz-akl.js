const BaseImporter = require('../BaseImporter')

class ATImporter extends BaseImporter {
  constructor() {
    super()
    this.zipname = 'at'
    this.url = 'https://atcdn.blob.core.windows.net/data/gtfs.zip'
  }
}

// auckland.files = auckland.files.map(file => {
//   if (file.name !== 'agency.txt') {
//     file.versioned = true
//   }
//   return file
// })
module.exports = ATImporter
