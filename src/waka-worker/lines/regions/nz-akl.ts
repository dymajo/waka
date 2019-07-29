import lineGroupsJSON from './nz-akl-groups.json'
import allLinesJSON from './nz-akl-lines.json'
import BaseLines, { BaseLinesProps } from '../../../types/BaseLines'

const lineIcons = {
  EAST: 'nz/at-metro-eastern',
  ONE: 'nz/at-metro-onehunga',
  STH: 'nz/at-metro-southern',
  PUK: 'nz/at-metro-southern',
  WEST: 'nz/at-metro-western',
  // enable this if they want to pay us lots of money
  // 'SKY': 'nz/skybus-raster',
}

const friendlyNames = {
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
  '106': 'Freemans Bay Loop',
  '107': 'Avondale Loop',
  '186': 'South Lynn Loop',
  '783': 'Eastern Bays Circuit',
  '321': 'Hospitals',
}

class LinesNZAKL extends BaseLines {
  constructor(props: BaseLinesProps) {
    super(props)

    this.lineIcons = lineIcons
    this.lineGroups = lineGroupsJSON
    this.friendlyNames = friendlyNames
    this.allLines = allLinesJSON
    this.lineOperators = {}
    this.lineColors = {}
  }

  async getLines() {
    const { logger, dataAccess, allLines } = this
    const routes = Object.keys(allLines)
    const lineOperators: { [routeShortName: string]: string } = {}
    const lineColors: { [routeShortName: string]: string } = {}
    const lines: {
      [routeShortName: string]: {
        routeLongName: string
        routeId: string
        routeColor: string
        routeShortName: string
        agencyId: string
      }
    } = {}
    await Promise.all(
      routes.map(
        route =>
          new Promise(async resolve => {
            const result = await dataAccess.getRouteInfo(route)

            if (result.recordset.length > 0) {
              const {
                agency_id: agencyId,
                route_id: routeId,
                route_long_name: routeLongName,
                route_short_name: routeShortName,
              } = result.recordset[0]
              const routeColor = `#${result.recordset[0].route_color}`

              lineColors[route] = routeColor
              lineOperators[route] = agencyId
              lines[route] = {
                agencyId,
                routeColor,
                routeId,
                routeLongName,
                routeShortName,
              }
              resolve(route)
            } else {
              logger.warn({ route }, 'Could not find agency for route.')
              // don't reject, because one error will cause everything to fail
              resolve(route)
            }
          })
      )
    )
    const groups = lineGroupsJSON.map(group => {
      return {
        name: group.name,
        items: group.items.map(item => {
          return lines[item]
        }),
      }
    })
    this.lineGroupsV2 = groups
    this.lineOperators = lineOperators
    this.lineColors = lineColors
    logger.info('Completed Lookup of Agencies.')
  }
}

export default LinesNZAKL
