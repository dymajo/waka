import SingleImporter from '../SingleImporter'

class ChchImporter extends SingleImporter {
  constructor() {
    super({
      zipname: 'metro-christchurch',
      url: 'http://metroinfo.co.nz/Documents/gtfs.zip',
    })
  }
}

export default ChchImporter
