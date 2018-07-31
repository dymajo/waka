const colors = require('colors')
const cache = require('../../cache.js')
const log = require('../../../server-common/logger.js')
const queries = require('../queries.js')

const groups = [
  {
    id: 'cf',
    name: 'Congestion Free',
  },
  {
    id: 'central',
    name: 'Central',
  },
  {
    id: 'hutt',
    name: 'Hutt Valley',
  },
  {
    id: 'porirua',
    name: 'Porirua',
  },
  {
    id: 'paraparaumu',
    name: 'Paraparaumu',
  },
  {
    id: 'wairarapa',
    name: 'Wairarapa',
  },
  {
    id: 'lateNight',
    name: 'Late Night',
  },
]

const regionEnum = {}
groups.forEach((data, index) => {
  regionEnum[data.id] = index
})

const lineGroups = groups.map(item => {
  return {
    name: item.name,
    items: []
  }
})

const lineColors = {}
const friendlyNames = {}
const allLines = {}
const lineOperators = {}

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

const sortLines = lineGroups => {
  lineGroups.forEach(group => {
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
    group.items.sort(collator.compare)
  })
}

const getLines = async () => {
  const result = await queries.getRoutes()
  result.recordset.forEach(record => {
    allLines[record.route_short_name] = [[record.route_long_name]]

    lineOperators[record.route_short_name] = record.agency_id
    if (record.route_type !== 3) {
      lineGroups[regionEnum.cf].items.push(record.route_short_name)
    } else {
      if (record.route_short_name.slice(0, 1) === 'N') {
        lineGroups[regionEnum.lateNight].items.push(record.route_short_name)
      } else if (parseInt(record.route_short_name) >= 250) {
        lineGroups[regionEnum.paraparaumu].items.push(record.route_short_name)
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
}
cache.ready.push(getLines)

module.exports = {
  lineColors: lineColors,
  lineGroups: lineGroups,
  friendlyNames: friendlyNames,
  allLines: allLines,
  lineOperators: lineOperators,
}
