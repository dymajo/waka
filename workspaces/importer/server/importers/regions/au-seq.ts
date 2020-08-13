import SingleImporter from '../SingleImporter'

class SEQImporter extends SingleImporter {
  constructor() {
    super({
      url: 'https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip',
      zipname: 'seq_gtfs',
    })
  }
}

export default SEQImporter
