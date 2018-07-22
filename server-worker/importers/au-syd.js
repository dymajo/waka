const defaultConfig = require('./defaultConfig.js')

const sydney = defaultConfig.get('sydney', {
  url:
    'https://api.transport.nsw.gov.au/v1/publictransport/timetables/complete/gtfs',
  headers: {
    Authorization: process.env.nswApiKey,
  },
})
module.exports = sydney
