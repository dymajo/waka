import BaseLines from '../../../types/BaseLines'

class GenericLines extends BaseLines {
  getLines = async () => {
    const { logger, dataAccess } = this
    const lineOperators: { [routeShortName: string]: string } = {}
    const allLines: {
      [routeShortName: string]: string[][]
    } = {}
    const lineColors: { [routeShortName: string]: string } = {}
    const lineGroups: {
      name: string
      items: string[]
    }[] = [
      { name: 'Tram', items: [] },
      { name: 'Subway / Metro', items: [] },
      { name: 'Rail', items: [] },
      { name: 'Bus', items: [] },
      { name: 'Ferry', items: [] },
      { name: 'Cable Car', items: [] },
      { name: 'Gondola', items: [] },
      { name: 'Funicular', items: [] },
      { name: 'Other', items: [] },
    ]

    const [
      tram,
      subway,
      rail,
      bus,
      ferry,
      cableCar,
      gondola,
      funicular,
      other,
    ] = lineGroups
    const result = await dataAccess.getRoutes()
    result.recordset.forEach(record => {
      lineOperators[record.route_short_name] = record.agency_id
      const splitName = record.route_long_name
        .replace(/^\d+\W+/, '')
        .split(' - ')
      const viaSplit = (splitName[1] || '').split('via')
      const lineEntry = [splitName[0]]
      if (viaSplit.length > 1) {
        lineEntry.push(viaSplit[0])
        lineEntry.push(viaSplit[1])
      } else if (splitName.length === 2) {
        lineEntry.push(splitName[1])
      }
      const {
        route_type: routeType,
        route_short_name: routeShortName,
        route_desc: routeDesc,
        route_id: routeId,
        route_long_name: routeLongName,
        route_color: routeColor,
      } = record

      if (Object.prototype.hasOwnProperty.call(allLines, routeShortName)) {
        allLines[routeShortName].push(lineEntry)
      } else {
        allLines[routeShortName] = [lineEntry]
        lineColors[routeShortName] = `#${routeColor}`
      }

      // tram
      if (routeType === 0 || (routeType >= 900 && routeType < 1000)) {
        tram.items.push(routeShortName)
      }
      // subway
      else if (routeType === 1 || routeType === 401 || routeType === 402) {
        subway.items.push(routeShortName)
      }
      // rail
      else if (
        routeType === 2 ||
        (routeType >= 100 && routeType < 200) ||
        routeType === 400 ||
        (routeType >= 404 && routeType <= 405)
      ) {
        rail.items.push(routeShortName)
      }
      // bus
      else if (
        routeType === 3 ||
        (routeType >= 700 && routeType < 712) ||
        (routeType > 712 && routeType <= 717)
      ) {
        bus.items.push(routeShortName)
      }
      // ferry
      else if (routeType === 4 || routeType === 1000 || routeType === 1200) {
        ferry.items.push(routeShortName)
      }
      // cable car
      else if (routeType === 5 || routeType === 907) {
        cableCar.items.push(routeShortName)
      }
      // gondola
      else if (routeType === 6 || routeType === 1100 || routeType === 1300) {
        gondola.items.push(routeShortName)
      }
      // funicular
      else if (routeType === 7 || routeType === 1400) {
        funicular.items.push(routeShortName)
      }
      // undefined other????
      else {
        other.items.push(routeShortName)
      }
    })
    this.lineGroups = lineGroups.filter(group => group.items.length !== 0)
    this.lineOperators = lineOperators
    this.allLines = allLines
    this.lineColors = lineColors
    logger.info('got lines')
  }
}

export default GenericLines
