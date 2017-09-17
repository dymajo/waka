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
  const ag_mapper = {
    'WCCL': 'e43e42',
    'EBYW': '41bada',
  }
  const rt_mapper = {
    'HVL': 'e52f2b',
    'JVL': '4f9734',
    'KPL': 'f39c12',
    'MEL': '21b4e3',
    'WRL': 'e52f2b',
    '5': 'ff602d',
    '6': '00a07c',
    '9': 'ff3818',
    '13': 'be5816',
    '14': '80a9bd',
    '20': 'fa8ec3',
    '21': '6a741d',
    '24': '19382c',
    '25': '09314f',
    '28': 'fdb02d',
    '29': '00768d',
    '47': 'a86419',
    '50': '0b8c5a',
    '52': '5d9734',
    '53': 'f76a1f',
    '54': 'd82574',
    '55': '80311c',
    '56': 'ff7b27',
    '57': '0e7c8a',
    '58': 'd82574',
    '83': 'cf3113',
    '91': 'ff9430',
    '110': '914aa5',
    '111': '0068a7',
    '112': '72d8f7',
    '114': 'b7bb33',
    '115': '006a49',
    '120': '54bc49',
    '121': '0068a7',
    '130': '00b8f1',
    '145': '00768d',
    '150': 'ac1846',
    '154': 'fc529b',
    '160': 'fa2b2e',
    '170': '968a19',
    '200': 'fc529b',
    '201': '007a87',
    '202': 'ffb52f',
    '203': '6f85c5',
    '204': 'b4d099',
    '205': '72d8f7',
    '206': 'f02a63',
    '210': '751506',
    '211': 'ff7233',
    '220': '258d52',
    '226': '1e83b6',
    '230': 'e6273f',
    '236': '7f2479',
    '250': '006a9f',
    '251': '0068a7',
    '260': '4b155e',
    '261': 'ff2d16',
    '262': '87b366',
    '263': '0068a7',
    '270': 'ff6920',
    '280': '0b349b',
    '289': '0068a7',
    '290': '00afe7',
    '300': '0068a7',
    'N1': 'eb9c4f',
    'N2': '824f9a',
    'N3': 'ed8dbd',
    'N4': '86a7ba',
    'N5': 'b42d72',
    'N6': '065880',
    'N8': '36bac9',
    'N22': '4fad55',
    'N66': '909543',
    'N88': 'ad3e35',
  }
  if (['1', '4', '32'].indexOf(route_short_name) > -1) {
    return '#9b2994'
  } else if (['2', '31'].indexOf(route_short_name) > -1) {
    return '#fa2b2e'
  } else if (['3', '3S', '3W', '17'].indexOf(route_short_name) > -1) {
    return '#74c447'
  } else if (['7', '8'].indexOf(route_short_name) > -1) {
    return '#df6c1d'
  } else if (['10', '30', '11'].indexOf(route_short_name) > -1) {
    return '#80311c'
  } else if (['18', '43', '44', '45', '46'].indexOf(route_short_name) > -1) {
    return '#3ac1ee'
  } else if (['22', '23'].indexOf(route_short_name) > -1) {
    return '#ff8d26'
  } else if (['54', '55'].indexOf(route_short_name) > -1) {
    return '#d82574'
  } else if (['70', '80'].indexOf(route_short_name) > -1) {
    return '#002a49'
  } else if (['81', '84', '85'].indexOf(route_short_name) > -1) {
    return '#c03222'
  } else if (['90', '92', '93'].indexOf(route_short_name) > -1) {
    return '#a28875'
  } else if (['97', '97H', '97N'].indexOf(route_short_name) > -1) {
    return '#139fda'
  }
  let retValue = rt_mapper[route_short_name] || ag_mapper[agency] || '000'
  return '#' + retValue
}

const lineGroups = [{
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
