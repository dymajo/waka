const sql = require('mssql')
const connection = require('../db/connection.js')
const colors = require('colors')
const cache = require('../cache.js')
const log = require('../../server-common/logger.js')

const regionEnum = {
  cf: 0,
  central: 1,
  hutt: 2,
  porirua: 3,
  paraparaumu: 4,
  wairarapa: 5,
  lateNight: 6,
}

const lineColors = {}
const lineColorizer = (agency, route_short_name, db_color) => {
  const ag_mapper = {
    WCCL: 'e43e42',
    EBYW: '41bada',
  }
  const rt_mapper = {
    HVL: 'e52f2b',
    JVL: '4f9734',
    KPL: 'f39c12',
    MEL: '21b4e3',
    WRL: 'e52f2b',
  }
  let retValue =
    rt_mapper[route_short_name] || ag_mapper[agency] || db_color || '000000'
  return '#' + retValue
}

const lineGroups = [
  {
    name: 'Congestion Free',
    items: [],
  },
  {
    name: 'Central',
    items: [],
  },
  {
    name: 'Hutt Valley',
    items: [],
  },
  {
    name: 'Porirua',
    items: [],
  },
  {
    name: 'Paraparaumu',
    items: [],
  },
  {
    name: 'Wairarapa',
    items: [],
  },
  {
    name: 'Late Night',
    items: [],
  },
]
const friendlyNames = {}
const allLines = {}
const lineOperators = {}

const sortLines = lineGroups => {
  lineGroups.forEach(group => {
    group.items.sort((a, b) => {
      const parsedA = parseInt(a.replace(/\D+/g, ''))
      const parsedB = parseInt(b.replace(/\D+/g, ''))

      if (parsedA === parsedB) {
        return a.length - b.length
      }
      return parsedA - parsedB
    })
  })
}

const getLines = () => {
  const sqlRequest = connection.get().request()
  sqlRequest
    .query(
      `
    SELECT
      route_short_name, route_long_name, agency_id, route_type, route_color
    FROM routes
    ORDER BY route_type, route_short_name
  `
    )
    .then(result => {
      result.recordset.forEach(record => {
        allLines[record.route_short_name] = [[record.route_long_name]]

        lineOperators[record.route_short_name] = record.agency_id
        if (record.route_type !== 3) {
          lineGroups[regionEnum.cf].items.push(record.route_short_name)
        } else {
          if (record.route_short_name.slice(0, 1) === 'N') {
            lineGroups[regionEnum.lateNight].items.push(record.route_short_name)
          } else if (parseInt(record.route_short_name) >= 250) {
            lineGroups[regionEnum.paraparaumu].items.push(
              record.route_short_name
            )
          } else if (
            parseInt(record.route_short_name) >= 200 &&
            parseInt(record.route_short_name) < 210
          ) {
            lineGroups[regionEnum.wairarapa].items.push(record.route_short_name)
          } else if (
            parseInt(record.route_short_name) >= 80 &&
            parseInt(record.route_short_name) < 200
          ) {
            lineGroups[regionEnum.hutt].items.push(record.route_short_name)
          } else if (parseInt(record.route_short_name) > 200) {
            lineGroups[regionEnum.porirua].items.push(record.route_short_name)
          } else {
            lineGroups[regionEnum.central].items.push(record.route_short_name)
          }
        }

        lineColors[record.route_short_name] = lineColorizer(
          record.agency_id,
          record.route_short_name,
          record.route_color
        )
      })

      sortLines(lineGroups)
      log('nz-wlg'.magenta, 'Cached Lines')
    })
    .catch(err => console.warn(err))
}
cache.ready.push(getLines)

module.exports = {
  lineColors: lineColors,
  lineGroups: lineGroups,
  friendlyNames: friendlyNames,
  allLines: allLines,
  lineOperators: lineOperators,
}
