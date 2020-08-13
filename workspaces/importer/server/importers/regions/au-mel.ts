import SingleImporter from '../SingleImporter'

class MelbourneImporter extends SingleImporter {
  constructor() {
    super({
      url: 'http://data.ptv.vic.gov.au/downloads/gtfs.zip',
      zipname: 'melbourne',
    })
  }
}

export default MelbourneImporter
