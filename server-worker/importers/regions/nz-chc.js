const defaultConfig = require('../defaultConfig.js')

const christchurch = defaultConfig.get('metro-christchurch', {
  url: 'http://metroinfo.co.nz/Documents/gtfs.zip',
})
module.exports = christchurch
