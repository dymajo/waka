const cache = require('../cache')
const sql = require('mssql')
const connection = require('../db/connection.js')

const lineGroups = [{
  name: "Congestion Free",
  items: [],
},
{
  name: "Ferries",
  items: [],
},
{
  name: "Bus",
  items: [],
}]
const friendlyNames = {}
const allLines = {}
const lineOperators = {}

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
      if (record.route_type === 2 || record.route_type === 5) {
        lineGroups[0].items.push(record.route_short_name)
      } else if (record.route_type === 4) {
        lineGroups[1].items.push(record.route_short_name)
      } else {
        lineGroups[2].items.push(record.route_short_name)
      }
    })
    console.log('nz-wlg:', 'Cached Lines')
  }).catch(err => console.warn(err))
}
cache.ready.push(getLines)

module.exports = {
  lineGroups: lineGroups,
  friendlyNames: friendlyNames,
  allLines: allLines,
  lineOperators: lineOperators
}

