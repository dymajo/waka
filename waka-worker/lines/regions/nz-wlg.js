const DataAccess = require('../dataAccess.js')

const groups = [
  {
    id: 'cf',
    name: 'Congestion Free',
  },
  {
    id: 'central',
    name: 'Central',
  },
  {
    id: 'hutt',
    name: 'Hutt Valley',
  },
  {
    id: 'porirua',
    name: 'Porirua',
  },
  {
    id: 'paraparaumu',
    name: 'Paraparaumu',
  },
  {
    id: 'wairarapa',
    name: 'Wairarapa',
  },
  {
    id: 'lateNight',
    name: 'Late Night',
  },
]

const regionEnum = {}
groups.forEach((data, index) => {
  regionEnum[data.id] = index
})

class LinesNZWLG {
  constructor(props) {
    const { logger, connection } = props
    this.logger = logger
    this.connection = connection
    this.dataAccess = new DataAccess({ connection })

    this.lineColors = {}
    this.lineGroups = {}
    this.allLines = {}
    this.lineOperators = {}
  }

  async start() {
    await this.getLines()
  }

  async getLines() {
    const { logger, dataAccess } = this
    const allLines = {}
    const lineOperators = {}
    const lineColors = {}
    const lineGroups = groups.map(item => ({
      name: item.name,
      items: [],
    }))

    const result = await dataAccess.getRoutes()
    result.recordset.forEach(record => {
      const routeShortName = record.route_short_name
      allLines[routeShortName] = [[record.route_long_name]]

      lineOperators[routeShortName] = record.agency_id
      if (record.route_type !== 3) {
        lineGroups[regionEnum.cf].items.push(routeShortName)
      } else if (routeShortName.slice(0, 1) === 'N') {
        lineGroups[regionEnum.lateNight].items.push(routeShortName)
      } else if (parseInt(routeShortName, 10) >= 250) {
        lineGroups[regionEnum.paraparaumu].items.push(routeShortName)
      } else if (
        parseInt(routeShortName, 10) >= 200 &&
        parseInt(routeShortName, 10) < 210
      ) {
        lineGroups[regionEnum.wairarapa].items.push(routeShortName)
      } else if (
        parseInt(routeShortName, 10) >= 80 &&
        parseInt(routeShortName, 10) < 200
      ) {
        lineGroups[regionEnum.hutt].items.push(routeShortName)
      } else if (parseInt(routeShortName, 10) > 200) {
        lineGroups[regionEnum.porirua].items.push(routeShortName)
      } else {
        lineGroups[regionEnum.central].items.push(routeShortName)
      }

      lineColors[routeShortName] = this.lineColorizer(
        record.agency_id,
        record.route_short_name,
        record.route_color
      )
    })

    lineGroups.forEach(group => {
      const collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      group.items.sort(collator.compare)
    })

    this.allLines = allLines
    this.lineOperators = lineOperators
    this.lineColors = lineColors
    this.lineGroups = lineGroups
    logger.info('Cached Lines')
  }

  lineColorizer(agency, routeShortName, dbColor) {
    const agMapper = {
      WCCL: 'e43e42',
      EBYW: '41bada',
    }
    const rtMapper = {
      HVL: 'e52f2b',
      JVL: '4f9734',
      KPL: 'f39c12',
      MEL: '21b4e3',
      WRL: 'e52f2b',
    }
    const retValue =
      rtMapper[routeShortName] || agMapper[agency] || dbColor || '000000'
    return `#${retValue}`
  }
}
module.exports = LinesNZWLG
