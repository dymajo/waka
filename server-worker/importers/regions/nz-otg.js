const defaultConfig = require('../defaultConfig.js')

const otago = defaultConfig.get('otago', {
  url: 'https://www.orc.govt.nz/transit/google_transit.zip',
})
module.exports = otago
