import BaseLines from '../../../types/BaseLines'
import { parseRoutes } from '../helpers'

class LinesNZAKL extends BaseLines {
  lineIcons: { [routeShortName: string]: string } = {
    'AM/EAST': 'nz/at-metro-eastern',
    'AM/ONE': 'nz/at-metro-onehunga',
    'AM/STH': 'nz/at-metro-southern',
    'AM/PUK': 'nz/at-metro-southern',
    'AM/WEST': 'nz/at-metro-western',
    // enable this if they want to pay us lots of money
    // 'ABEXP/SKY': 'nz/skybus-raster',
  }

  friendlyNames: { [routeShortName: string]: string } = {
    NX1: 'Northern Express 1',
    NX2: 'Northern Express 2',
    EAST: 'Eastern Line',
    ONE: 'Onehunga Line',
    STH: 'Southern Line',
    WEST: 'Western Line',
    PUK: 'Pukekohe Shuttle',
    CTY: 'CityLink',
    INN: 'InnerLink',
    OUT: 'OuterLink',
    '380': 'Airporter',
    MTIA: 'Auckland to Waiheke Island',
    SKY: 'SkyBus',
    TMK: 'TāmakiLink',
    MEX: 'Mahu City Express',
  }

  async getLines() {
    const { logger, dataAccess } = this
    const lineGroups: {
      name: string
      items: {
        routeId: string
        routeShortName: string
        routeLongName: string
        agencyId: string
        routeColor: string
      }[]
    }[] = [
      { name: 'Congestion Free Network', items: [] },
      { name: 'Ferries', items: [] },
      { name: 'Central', items: [] },
      { name: 'South', items: [] },
      { name: 'East', items: [] },
      { name: 'West', items: [] },
      { name: 'North Shore', items: [] },
      { name: 'Waiheke Island', items: [] },
      { name: 'Hibiscus Coast & Rodney', items: [] },
      { name: 'Other', items: [] },
    ]

    const [
      congestionFree,
      ferries,
      central,
      south,
      east,
      west,
      north,
      waiheke,
      rodney,
      other,
    ] = lineGroups

    const routesData = await dataAccess.getRoutes()
    const {
      routes,
      allLines,
      friendlyNumbers,
      lineOperators,
      lineColors,
    } = parseRoutes(routesData, this.friendlyNames)
    routes
      .filter(routeItem => routeItem.duplicate === false)
      .forEach(routeItem => {
        const { routeType, routeShortName, agencyId } = routeItem
        delete routeItem.routeType
        delete routeItem.duplicate

        const routePrefix = parseInt(routeShortName.slice(0, 2), 10)

        // congestion free network
        if (
          routeType === 2 ||
          (routeType >= 100 && routeType < 200) ||
          routeType === 400 ||
          (routeType >= 404 && routeType <= 405) ||
          ['NX1', 'NX2'].includes(routeShortName)
        ) {
          congestionFree.items.push(routeItem)
        } else if (
          routeType === 4 ||
          routeType === 1000 ||
          routeType === 1200
        ) {
          ferries.items.push(routeItem)
        } else if (agencyId === 'WBC') {
          waiheke.items.push(routeItem)
        } else if (
          routePrefix === 10 ||
          (routePrefix >= 20 && routePrefix < 30) ||
          (routePrefix >= 60 && routePrefix < 70) ||
          ['CTY', 'INN', 'OUT', 'TMK', 'SKY'].includes(routeShortName)
        ) {
          central.items.push(routeItem)
        } else if (routeShortName[0] === '3' || routeShortName === 'N10') {
          // only one night bus in auckland left!
          south.items.push(routeItem)
        } else if (routeShortName[0] === '7') {
          east.items.push(routeItem)
        } else if (routePrefix >= 11 && routePrefix < 20) {
          west.items.push(routeItem)
        } else if (routePrefix >= 80 && routePrefix < 98) {
          north.items.push(routeItem)
        } else if (routePrefix >= 98 || routeShortName === 'MEX') {
          rodney.items.push(routeItem)
        } else {
          // only push it into a group if it's not already a group
          other.items.push(routeItem)
        }
      })

    this.lineGroups = lineGroups.map(group => ({
      name: group.name,
      items: group.items.map(i => [i.agencyId, i.routeShortName].join('/')),
    }))
    this.lineGroupsV2 = lineGroups.filter(group => group.items.length !== 0)
    this.lineOperators = lineOperators
    this.friendlyNumbers = friendlyNumbers
    this.allLines = allLines
    this.lineColors = lineColors

    logger.info('Completed Lookup of Agencies.')
  }
}

export default LinesNZAKL
