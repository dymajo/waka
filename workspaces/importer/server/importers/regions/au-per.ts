import SingleImporter from '../SingleImporter'

class PerthImporter extends SingleImporter {
  constructor() {
    super({
      url:
        'https://www.transperth.wa.gov.au/TimetablePDFs/GoogleTransit/Production/google_transit.zip',
      zipname: 'transperth',
    })
  }
}

export default PerthImporter
