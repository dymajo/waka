import BaseLines, { BaseLinesProps } from '../../../types/BaseLines'

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

const regionEnum: { [region: string]: number } = {}
groups.forEach((data, index) => {
  regionEnum[data.id] = index
})

class LinesNZWLG extends BaseLines {
  constructor(props: BaseLinesProps) {
    super(props)

    this.lineColors = {}
    this.lineGroups = []
    this.allLines = {}
    this.lineOperators = {}
  }

  async getLines() {
    const { logger, dataAccess } = this
    const allLines: { [routeShortName: string]: string[][] } = {}
    const lineOperators: { [routeShortName: string]: string } = {}
    const lineColors: { [routeShortName: string]: string } = {}
    const lineGroups = groups.map(item => ({
      name: item.name,
      items: [],
    }))

    const lines = {}
    const result = await dataAccess.getRoutes()
    result.recordset.forEach(record => {
      const routeShortName = record.route_short_name
      const agencyId = record.agency_id
      const routeId = record.route_id
      const routeLongName = record.route_long_name
      const uniqueKey = [agencyId, routeShortName].join('/')

      allLines[uniqueKey] = [[routeLongName]]

      lineOperators[uniqueKey] = agencyId
      if (record.route_type !== 3) {
        lineGroups[regionEnum.cf].items.push(uniqueKey)
      } else if (routeShortName.slice(0, 1) === 'N') {
        lineGroups[regionEnum.lateNight].items.push(uniqueKey)
      } else if (parseInt(routeShortName, 10) >= 250) {
        lineGroups[regionEnum.paraparaumu].items.push(uniqueKey)
      } else if (
        parseInt(routeShortName, 10) >= 200 &&
        parseInt(routeShortName, 10) < 210
      ) {
        lineGroups[regionEnum.wairarapa].items.push(uniqueKey)
      } else if (
        parseInt(routeShortName, 10) >= 80 &&
        parseInt(routeShortName, 10) < 200
      ) {
        lineGroups[regionEnum.hutt].items.push(uniqueKey)
      } else if (parseInt(routeShortName, 10) > 200) {
        lineGroups[regionEnum.porirua].items.push(uniqueKey)
      } else {
        lineGroups[regionEnum.central].items.push(uniqueKey)
      }

      const routeColor = this.lineColorizer(
        record.agency_id,
        record.route_short_name,
        record.route_color
      )
      lineColors[uniqueKey] = routeColor

      lines[uniqueKey] = {
        agencyId,
        routeColor,
        routeId,
        routeLongName,
        routeShortName,
      }
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

    this.lineGroupsV2 = lineGroups.map(group => {
      return {
        name: group.name,
        items: group.items.map(item => {
          return lines[item]
        }),
      }
    })
    logger.info('Cached Lines')
  }

  lineColorizer(agency: string, routeShortName: string, dbColor: string) {
    const agMapper: { [routeShortName: string]: string } = {
      WCCL: 'e43e42',
      EBYW: '41bada',
    }
    const rtMapper: { [routeShortName: string]: string } = {
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
export default LinesNZWLG
