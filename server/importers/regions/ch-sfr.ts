import SingleImporter from '../SingleImporter'

class SFRImporter extends SingleImporter {
  constructor() {
    super({
      url:
        'https://opentransportdata.swiss/en/dataset/timetable-2019-gtfs/permalink',
      zipname: 'sbb_cff_ffs',
    })
  }
}

export default SFRImporter
