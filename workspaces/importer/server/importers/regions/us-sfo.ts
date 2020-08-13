import MultiImporter from '../MultiImporter'

class SanFranciscoImporter extends MultiImporter {
  constructor() {
    super({
      locations: [
        {
          endpoint: 'http://www.caltrain.com/Assets/GTFS/caltrain/CT-GTFS.zip',
          type: 'rail',
          name: 'caltrain',
        },
        {
          endpoint: 'http://www.bart.gov/dev/schedules/google_transit.zip',
          type: 'rail',
          name: 'bart',
        },
        {
          endpoint: 'http://gtfs.sfmta.com/transitdata/google_transit.zip',
          type: 'combined',
          name: 'muni',
        },
      ],
    })
  }
}

export default SanFranciscoImporter
