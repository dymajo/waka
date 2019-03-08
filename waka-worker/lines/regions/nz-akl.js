const DataAccess = require('../dataAccess.js')
const lineGroups = require('./nz-akl-groups.json')
const allLines = require('./nz-akl-lines.json')

const getColor = (agencyId, code) => {
  switch (agencyId) {
    case 'AM': // Auckland Metro
      switch (code) {
        case 'WEST': // West Line
          return '#84bd00'
        case 'STH': // South Line
          return '#da291c'
        case 'EAST': // East Line
          return '#ed8b00'
        case 'PUK': // South Line
          return '#da291c'
        case 'ONE': // ONE Line
          return '#00a6d6'

        default:
          return '#00254b'
      }
    case 'FGL': // Fullers
      return '#2756a4'

    case 'HE': // Howick and Eastern
      return '#2196F3'

    case 'NZBGW': // NZ Bus - Go West
      return '#4CAF50'

    case 'NZB': // NZ Bus - metrolink
      switch (code) {
        case 'CTY': // City Link
          return '#ef3c34'

        case 'INN': // Inner Link
          return '#41b649'

        case 'OUT': // Outer Link
          return '#f7991c'

        case 'TMK':
          return '#038fcc'

        default:
          return '#0759b0'
      }

    case 'NZBML': // NZ Bus - metrolink
      switch (code) {
        case 'CTY': // City Link
          return '#ef3c34'

        case 'INN': // Inner Link
          return '#41b649'

        case 'OUT': // Outer Link
          return '#f7991c'

        case 'TMK':
          return '#038fcc'

        default:
          return '#0759b0'
      }

    case 'NZBNS': // NZ Bus - North Star
      return '#f39c12'

    case 'NZBWP': // NZ Bus - Waka Pacific
      return '#0f91ab'

    case 'UE': // Urban Express / Same as Pavolich
      return '#776242'

    case 'BTL': // Birkenhead Transport
      return '#b2975b'

    case 'RTH': // Ritchies
      switch (code) {
        case 'NX1': // Northern Express 1
          return '#123f90'

        default:
          return '#ff6f2c'
      }

    // Northern Express 2
    case 'TZG':
      return '#008540'

    case 'WBC': // Waiheke Bus Company
      return '#2196F3'

    case 'EXPNZ': // Explore Waiheke - supposed to be closed?
      return '#ffe81c'

    case 'BFL': // Belaire Ferries
      return '#ffd503'

    case 'ATAPT': // AT Airporter
      return '#f7931d'

    case 'SLPH': // Pine Harbour / Sealink
      return '#d92732'

    case 'GBT': // Go Bus
      return '#58aa17'

    case '360D': // 360 Discovery
      return '#2756a4'

    case 'ABEXP': // Skybus
      return '#F44336'

    case 'PC': // Pavolich
      return '#776242'

    default:
      // MSB, PBC, BAYES - Schools
      return '#17232f'
  }
}
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

class LinesNZAKL {
  constructor(props) {
    const { logger, connection } = props
    this.logger = logger
    this.connection = connection
    this.dataAccess = new DataAccess({ connection })

    this.lineIcons = lineIcons
    this.lineGroups = lineGroups
    this.friendlyNames = friendlyNames
    this.allLines = allLines
    this.getColor = getColor
    this.lineOperators = {}
    this.lineColors = {}
  }

  start() {
    this.cacheOperatorsAndShapes()
  }

  async cacheOperatorsAndShapes() {
    const { logger, dataAccess } = this
    const routes = Object.keys(allLines)
    const lineOperators = {}
    const lineColors = {}

    await Promise.all(
      routes.map(
        route =>
          new Promise(async (resolve, reject) => {
            const result = await dataAccess.getOperator(route)
            if (result.recordset.length > 0) {
              const agencyId = result.recordset[0].agency_id
              lineColors[route] = getColor(agencyId, routes[route])
              lineOperators[route] = agencyId
              resolve(route)
            } else {
              logger.warn({ route }, 'Could not find agency.')
              reject(route)
            }
          })
      )
    )

    this.lineOperators = lineOperators
    this.lineColors = lineColors
    logger.info('Completed Lookup of Agencies.')
  }
}

module.exports = LinesNZAKL
