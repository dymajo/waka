const connection = require('../db/connection.js')
const cache = require('../cache.js')

const friendlyNumbers = {}
const allLines = {}
const lineColors = {}
const lineGroups = [{
  name: 'Ōtepoti, Dunedin',
  items: [],
},
{
  name: 'Tāhuna, Queenstown',
  items: [],
}]

const getLines = () => {
  const sqlRequest = connection.get().request()
  sqlRequest.query(`
    SELECT
      route_id, route_short_name, route_long_name, agency_id, route_type, route_color
    FROM routes
    ORDER BY route_type, route_short_name
  `).then(result => {
    result.recordset.forEach(record => {
      const route_code_prefix = record.agency_id === 'ORC' ? '' : record.agency_id
      const route_code = route_code_prefix + record.route_short_name
      if (!(route_code in allLines)) {
        allLines[route_code]  = [[record.route_long_name]]
        lineColors[route_code] = '#' + record.route_color.toLowerCase()

        if (route_code !== record.route_short_name) {
          friendlyNumbers[route_code] = record.route_short_name
        }

        if (route_code_prefix !== '') {
          lineGroups[1].items.push(route_code)
        } else {
          lineGroups[0].items.push(route_code)
        }
      } else {
        allLines[route_code].push([record.route_long_name])
      }
    })
  })
}
cache.ready.push(getLines)

module.exports = {
  lineColors: lineColors,
  lineGroups: lineGroups,
  friendlyNames: {},
  friendlyNumbers: friendlyNumbers,
  allLines: allLines,
  lineOperators: {}
}