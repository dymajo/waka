import SingleImporter from '../SingleImporter'

class BostonImporter extends SingleImporter {
  constructor() {
    super({
      url: 'https://cdn.mbta.com/MBTA_GTFS.zip',
      zipname: 'mbta',
    })
  }
}

export default BostonImporter
