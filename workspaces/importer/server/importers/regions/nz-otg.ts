import SingleImporter from '../SingleImporter'

class OtagoImporter extends SingleImporter {
  constructor() {
    super({
      zipname: 'otago',
      url: 'https://www.orc.govt.nz/transit/google_transit.zip',
    })
  }
}

export default OtagoImporter
