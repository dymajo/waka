import { IResult } from 'mssql'

export const parseRoutes = (
  dbResult: IResult<{
    route_short_name: string
    route_long_name: string
    agency_id: string
    route_type: number
    route_color: string
    route_desc: string
    route_id: string
  }>,
  friendlyNames: { [routeShortName: string]: string }
) => {
  const lineOperators: { [routeShortName: string]: string } = {}
  const friendlyNumbers: { [routeShortName: string]: string } = {}
  const allLines: {
    [routeShortName: string]: string[][]
  } = {}
  const lineColors: { [routeShortName: string]: string } = {}

  const routes = dbResult.recordset.map(record => {
    const splitName = record.route_long_name.replace(/^\d+\W+/, '').split(' - ')
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
      route_id: routeId,
      route_long_name: routeLongName,
      agency_id: agencyId,
    } = record
    const routeColor = `#${record.route_color}`

    // this assumes there's a unique key over these records!
    const uniqueId = [agencyId, routeShortName].join('/')
    lineOperators[uniqueId] = agencyId
    friendlyNumbers[uniqueId] = routeShortName

    // this duplicate property gives cities like auckland an easy way to filter out loads of the same route
    let duplicate = false
    if (Object.prototype.hasOwnProperty.call(allLines, uniqueId)) {
      allLines[uniqueId].push(lineEntry)
      duplicate = true
    } else {
      allLines[uniqueId] = [lineEntry]
      lineColors[uniqueId] = routeColor
    }
    const friendlyName = friendlyNames[routeShortName]
    return {
      agencyId,
      routeColor,
      routeShortName,
      routeLongName: friendlyName || routeLongName,
      routeId,
      routeType,
      duplicate,
    }
  })
  return { routes, allLines, friendlyNumbers, lineOperators, lineColors }
}
