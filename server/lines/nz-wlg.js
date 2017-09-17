const cache = require('../cache')
const sql = require('mssql')
const connection = require('../db/connection.js')
const colors = require('colors')

const regionEnum = {
  cf: 0,
  central: 1,
  hutt: 2,
  porirua: 3,
  paraparaumu: 4,
  wairarapa: 5,
  late: 6,
}

const lineColors = {}
const lineColorizer = (agency, route_short_name) => {
  switch (agency) {
  case 'WCCL':
    return '#ff0000'
  default:
    return '#bada55'
  }
}

const lineGroups = [{
  name: 'Congestion Free',
  items: [],
},
{
  name: 'Bus',
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
}
]
const friendlyNames = {}
const allLines = {}
const lineOperators = {}

const sortLines = (lines) => {
  const sortFn = (a, b) => {
    const parsedA = parseInt(a.replace(/\D+/g, ''))
    const parsedB = parseInt(b.replace(/\D+/g, ''))

    if (parsedA === parsedB) {
      return a.length - b.length
    }
    return parsedA - parsedB
  }
  lines.forEach((i) => {
    i.items.sort(sortFn)
  })
}

const getLines = () => {
  const sqlRequest = connection.get().request()
  sqlRequest.input('version', sql.VarChar(50), cache.currentVersion('nz-wlg'))
  sqlRequest.query(`
    SELECT
      route_short_name, route_long_name, agency_id, route_type
    FROM routes
      where prefix = 'nz-wlg' and version = @version
    ORDER BY route_type, route_short_name
  `).then(result => {
    result.recordset.forEach((record) => {
      allLines[record.route_short_name] = [[record.route_long_name]]
      lineOperators[record.route_short_name] = record.agency_id
      if (record.route_type !== 3) {
        lineGroups[regionEnum.cf].items.push(record.route_short_name)
      } else {
        if (record.route_short_name.slice(0,1) === 'N') {
          lineGroups[regionEnum.late].items.push(record.route_short_name)
        } else if (parseInt(record.route_short_name) >= 250) {
          lineGroups[regionEnum.paraparaumu].items.push(record.route_short_name)
        } else if (parseInt(record.route_short_name) >= 200 && parseInt(record.route_short_name) < 210) {
          lineGroups[regionEnum.wairarapa].items.push(record.route_short_name)
        } else if (parseInt(record.route_short_name) >= 80 && parseInt(record.route_short_name) < 200) {
          lineGroups[regionEnum.hutt].items.push(record.route_short_name)
        } else if (parseInt(record.route_short_name) > 200) {
          lineGroups[regionEnum.porirua].items.push(record.route_short_name)
        } else {
          lineGroups[regionEnum.central].items.push(record.route_short_name)
        }
      }

      lineColors[record.route_short_name] = lineColorizer(record.agency_id, record.route_short_name)
    })

    sortLines(lineGroups)
    console.log('nz-wlg:'.green, 'Cached Lines')
  }).catch(err => console.warn(err))
}
cache.ready.push(getLines)

module.exports = {
  lineColors: lineColors,
  lineGroups: lineGroups,
  friendlyNames: friendlyNames,
  allLines: allLines,
  lineOperators: lineOperators
}
