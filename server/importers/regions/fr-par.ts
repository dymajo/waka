import SingleImporter from '../SingleImporter'

class ParisImporter extends SingleImporter {
  constructor() {
    super({
      url: 'http://dataratp.download.opendatasoft.com/RATP_GTFS_FULL.zip',
      zipname: 'paris',
    })
  }
}

export default ParisImporter
