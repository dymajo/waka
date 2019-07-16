import MultiImporter from "../MultiImporter";

class NYCImporter extends MultiImporter {
  constructor() {
    super({
      locations: [
        {
          endpoint: 'http://web.mta.info/developers/data/nyct/subway/google_transit.zip',
          name: 'subway',
          type: 'subway'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/nyct/bus/google_transit_bronx.zip',
          name: 'bronxbus',
          type: 'bus'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/nyct/bus/google_transit_brooklyn.zip',
          name: 'brooklynbus',
          type: 'bus'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/nyct/bus/google_transit_manhattan.zip',
          name: 'manhattanbus',
          type: 'bus'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/nyct/bus/google_transit_queens.zip',
          name: 'queensbus',
          type: 'bus'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/nyct/bus/google_transit_staten_island.zip',
          name: 'statenislandbus',
          type: 'bus'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/busco/google_transit.zip',
          name: 'busco',
          type: 'bus'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/lirr/google_transit.zip',
          name: 'lirr',
          type: 'train'
        },
        {
          endpoint: 'http://web.mta.info/developers/data/mnr/google_transit.zip',
          name: 'mnr',
          type: 'train'
        }
      ]
    })
  }
}

export default NYCImporter