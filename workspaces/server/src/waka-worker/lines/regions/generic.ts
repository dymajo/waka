import BaseLines from '../../../types/BaseLines'
import { parseRoutes } from '../helpers'

class GenericLines extends BaseLines {
  getLines = async () => {
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
      { name: 'Light Rail', items: [] },
      { name: 'Subway / Metro', items: [] },
      { name: 'Rail', items: [] },
      { name: 'Ferry', items: [] },
      { name: 'Cable Car', items: [] },
      { name: 'Gondola', items: [] },
      { name: 'Funicular', items: [] },
      { name: 'Bus', items: [] },
      { name: 'Other', items: [] },
    ]

    const [
      tram,
      subway,
      rail,
      ferry,
      cableCar,
      gondola,
      funicular,
      bus,
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
    routes.forEach(routeItem => {
      const { routeType } = routeItem
      delete routeItem.routeType
      delete routeItem.duplicate

      if (routeType === 0 || (routeType >= 900 && routeType < 1000)) {
        tram.items.push(routeItem) // tram
      } else if (routeType === 1 || routeType === 401 || routeType === 402) {
        subway.items.push(routeItem) // subway
      } else if (
        routeType === 2 ||
        (routeType >= 100 && routeType < 200) ||
        routeType === 400 ||
        (routeType >= 404 && routeType <= 405)
      ) {
        rail.items.push(routeItem) // rail
      } else if (
        routeType === 3 ||
        (routeType >= 700 && routeType < 712) ||
        (routeType > 712 && routeType <= 717)
      ) {
        bus.items.push(routeItem) // bus
      } else if (routeType === 4 || routeType === 1000 || routeType === 1200) {
        ferry.items.push(routeItem) // ferry
      } else if (routeType === 5 || routeType === 907) {
        cableCar.items.push(routeItem) // cable car
      } else if (routeType === 6 || routeType === 1100 || routeType === 1300) {
        gondola.items.push(routeItem) // gondola
      } else if (routeType === 7 || routeType === 1400) {
        funicular.items.push(routeItem) // funicular
      } else {
        other.items.push(routeItem) // undefined other????
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

    logger.info('Created Generic Lines')
  }
}

export default GenericLines
