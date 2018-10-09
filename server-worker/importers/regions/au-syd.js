const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../../../server-common/logger.js')

const sydneyModes = [
  'nswtrains',
  'sydneytrains',
  'buses',
  'lightrail',
  'ferries',
]

const zipLocations = []

const get = () => ({
  zipLocation: zipLocations,  
  files: [
    {
      name: 'agency.txt',
      table: 'agency',
      versioned: false,
    },
    {
      name: 'stops.txt',
      table: 'stops',
      versioned: false,
    },
    {
      name: 'routes.txt',
      table: 'routes',
      versioned: false,
    },
    {
      name: 'trips.txt',
      table: 'trips',
      versioned: false,
    },
    {
      name: 'stop_times.txt',
      table: 'stop_times',
      versioned: false,
    },
    {
      name: 'calendar.txt',
      table: 'calendar',
      versioned: false,
    },
    {
      name: 'calendar_dates.txt',
      table: 'calendar_dates',
      versioned: false,
    },
  ],
  shapeFile: 'shapes.txt',
  download: () => {
    const tfnsw = sydneyModes.map(
      mode =>
        new Promise((resolve, reject) => {
          log(
            global.config.prefix.magenta,
            `Downloading tfnsw ${mode} gtfs data`
          )
          const zipLocation = path.join(
            __dirname,
            `../../../cache/sydney/${mode}.zip`
          )
          zipLocations.push(zipLocation)
          const downloadOptions = {
            url: `https://api.transport.nsw.gov.au/v1/gtfs/schedule/${mode}`,
            headers: {
              Authorization: process.env.nswApiKey,
            },
          }

          const gtfsRequest = request(downloadOptions).pipe(
            fs.createWriteStream(zipLocation)
          )
          gtfsRequest.on('finish', () => {
            log(`Finished downloading tfnsw ${mode} gtfs data`)
            resolve()
          })
          gtfsRequest.on('error', reject)
        })
    )
    return Promise.all(tfnsw)
  },
})

const sydney = get()

module.exports = sydney
