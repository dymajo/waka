import SingleImporter from '../SingleImporter'

class AucklandImporter extends SingleImporter {
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

export default AucklandImporter
