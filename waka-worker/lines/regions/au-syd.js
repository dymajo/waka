const DataAccess = require('../dataAccess.js')

class LinesAUSYD {
  constructor(props) {
    const { logger, connection } = props
    this.logger = logger
    this.connection = connection
    this.dataAccess = new DataAccess({ connection })

    // this.lineIcons = lineIcons
    // this.lineColors = lineColors
    this.allLines = {}
    this.lineGroups = {}
    this.lineOperators = {}
    // this.friendlyNames = friendlyNames
  }

  async start() {
    await this.getLines()
  }

  async getLines() {
    const { logger, dataAccess } = this
    const allLines = {}
    const lineOperators = {}
    const lineGroups = [
      { name: 'Metro', items: [] },
      { name: 'Suburban Trains', items: [] },
      {
        name: 'Intercity Trains',
        items: [],
      },
      { name: 'Regional Trains', items: [] },
      { name: 'Buses', items: [] },
      { name: 'Ferries', items: [] },
      { name: 'Light Rail', items: [] },
      { name: 'NSW TrainLink', items: [] },
      { name: 'Regional Coach', items: [] },
    ]
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
      if (allLines.hasOwnProperty(record.route_short_name)) {
        allLines[record.route_short_name].push(lineEntry)
      } else {
        allLines[record.route_short_name] = [lineEntry]

        const numericLine = parseInt(record.route_short_name, 10)
      }
      const {
        route_type: routeType,
        route_short_name: routeShortName,
        route_desc: routeDesc,
      } = record
      if (routeType === 401) {
        lineGroups[0].items.push(record.route_short_name)
      }
      if (routeType === 400 && routeShortName[0] === 'T') {
        lineGroups[1].items.push(record.route_short_name)
      }
      if (routeType === 1000) {
        lineGroups[5].items.push(record.route_short_name)
      }
      if (routeType === 700 && routeDesc !== 'School Buses') {
        lineGroups[4].items.push(record.route_short_name)
      }
      if (routeType === 204) {
        lineGroups[8].items.push(record.route_short_name)
      }
      if (routeType === 106) {
        lineGroups[3].items.push(record.route_short_name)
      }
      if (routeType === 900) {
        lineGroups[6].items.push(record.route_short_name)
      }

      lineGroups.forEach(group => {
        // this sorts text names before numbers
        group.items.sort((a, b) => {
          const parsedA = parseInt(a, 10)
          const parsedB = parseInt(b, 10)
          if (isNaN(parsedA) && isNaN(parsedB)) return a.localeCompare(b)
          if (isNaN(parsedA)) return -1
          if (isNaN(parsedB)) return 1
          return parsedA - parsedB
        })
      })
    })
    this.allLines = allLines
    this.lineOperators = lineOperators
    this.lineGroups = lineGroups
  }
}

module.exports = LinesAUSYD
