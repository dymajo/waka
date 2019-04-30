const BaseImporter = require('../BaseImporter')

class SBBCFFFFSImporter extends BaseImporter {
  constructor() {
    super({
      url:
        'https://opentransportdata.swiss/en/dataset/timetable-2019-gtfs/permalink',
      zipname: 'sbb_cff_ffs',
    })
  }
}

module.exports = SBBCFFFFSImporter
