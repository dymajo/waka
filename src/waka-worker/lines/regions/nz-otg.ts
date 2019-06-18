// TODO: make into a class
import connection from '../../db/connection'
import cache from '../../cache'

const agencyFilter = line => {
  line = line.toLowerCase()
  if (line.length > 3 && line.substring(0, 3) === 'qtn') {
    return 'QTN'
  }
  return null
}

const getColor = (agency, line) => {
  if (agency === 'QTN') {
    return lineColors[`QTN${line}`] || '#000'
  }
  return lineColors[line] || '#000'
}

const friendlyNumbers = {}
const allLines = {}
const lineColors = {}
const lineGroups = [
  {
    name: 'Tāhuna, Queenstown',
    items: [],
  },
  {
    name: 'Ōtepoti, Dunedin',
    items: [],
  },
]

const getLines = () => {
  const sqlRequest = connection.get().request()
  sqlRequest
    .query<{
      route_id: string
      route_short_name: string
      route_long_name: string
      agency_id: string
      route_type: string
      route_color: string
    }>(
      `
    SELECT
      route_id, route_short_name, route_long_name, agency_id, route_type, route_color
    FROM routes
    ORDER BY route_type, route_short_name
  `
    )
    .then(result => {
      result.recordset.forEach(record => {
        const route_code_prefix =
          record.agency_id === 'ORC' ? '' : record.agency_id
        const route_code = route_code_prefix + record.route_short_name
        if (!(route_code in allLines)) {
          allLines[route_code] = [[record.route_long_name]]
          lineColors[route_code] = `#${record.route_color.toLowerCase()}`

          if (route_code !== record.route_short_name) {
            friendlyNumbers[route_code] = record.route_short_name
          }

          if (route_code_prefix === '') {
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

export default {
  agencyFilter,
  getColor,
  lineColors,
  lineGroups,
  friendlyNames: {},
  friendlyNumbers,
  allLines,
  lineOperators: {},
}
