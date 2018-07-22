const cache = require('../../cache.js')
const log = require('../../../server-common/logger.js')
const queries = require('../queries.js')

const allLines = {}
const getLines = async () => {
  const result = await queries.getRoutes()
  result.recordset.map(record => {
    const splitName = record.route_long_name.replace(/^\d+\W+/, '').split(' - ')
    const viaSplit = (splitName[1] || '').split('via')

    const lineEntry = [splitName[0]]
    if (viaSplit.length > 1) {
      lineEntry.push(viaSplit[0])
      lineEntry.push(viaSplit[1])
    } else if (splitName.length == 2) {
      lineEntry.push(splitName[1])
    }

    allLines[record.route_short_name] = [lineEntry]
    lineGroups[0].items.push(record.route_short_name)
  })

  log('nz-chc'.magenta, 'Cached Lines')
}
cache.ready.push(getLines)

// obtained from: http://www.metroinfo.co.nz/timetables/Pages/default.aspx
// with Array.from(document.querySelectorAll('.routelistingnumber'))
// .map((item) => ({route_short_name: item.innerText.trim(), color: item.style.backgroundColor}))
const lineColors = {
  Blue: 'rgb(62, 188, 237)',
  Orange: 'rgb(243, 112, 33)',
  Orbiter: 'rgb(121, 188, 67)',
  Purple: 'rgb(85, 69, 136)',
  Yellow: 'rgb(255, 194, 14)',
  Diamond: 'rgb(0, 88, 153)',
  '17': 'rgb(236, 0, 140)',
  '28': 'rgb(247, 147, 40)',
  '29': 'rgb(0, 83, 159)',
  '44': 'rgb(0, 116, 173)',
  '60': 'rgb(218, 111, 171)',
  '80': 'rgb(113, 125, 189)',
  '85': 'rgb(240, 90, 78)',
  '95': 'rgb(196, 16, 57)',
  '100': 'rgb(136, 128, 126)',
  '107': 'rgb(70, 162, 153)',
  '108': 'rgb(181, 162, 206)',
  '120': 'rgb(250, 166, 26)',
  '125': 'rgb(95, 153, 55)',
  '130': 'rgb(159, 57, 37)',
  '135': 'rgb(13, 177, 75)',
  '140': 'rgb(0, 146, 158)',
  '145': 'rgb(149, 100, 56)',
  '150': 'rgb(152, 83, 161)',
  '535': 'rgb(210, 191, 165)',
  '820': 'rgb(70, 186, 124)',
}

const lineGroups = [
  {
    name: 'Frequent',
    items: [],
  },
]

module.exports = {
  allLines: allLines,
  lineColors: lineColors,
  lineGroups: lineGroups,
}
