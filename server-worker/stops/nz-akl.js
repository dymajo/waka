const colors = require('colors')
const request = require('request')
const log = require('../../server-common/logger.js')

const carparks = {
  'downtown-carpark': {
    stop_id: 'downtown-carpark', 
    stop_lat: -36.843621,
    stop_lon: 174.764136,
    stop_lng: 174.764136, // lng is deprecated
    stop_region: 'nz-akl',
    route_type: -1,
    stop_name: 'Downtown Carpark',
    description: 'Unknown Occupancy',
    timestamp: new Date(0),
    availableSpaces: 0,
    maxSpaces: 1944,
  },
  'civic-carpark': {
    stop_id: 'civic-carpark',
    stop_lat: -36.852857, 
    stop_lon: 174.762732,
    stop_lng: 174.762732, // lng is deprecated
    stop_region: 'nz-akl',
    route_type: -1,
    stop_name: 'Civic Carpark',
    description: 'Unknown Occupancy',
    timestamp: new Date(0),
    availableSpaces: 0,
    maxSpaces: 928,
  },
  'victoria-st-carpark': {
    stop_id: 'victoria-st-carpark',
    stop_lat: -36.849001,
    stop_lon: 174.766549,
    stop_lng: 174.766549, // lng is deprecated
    stop_region: 'nz-akl',
    route_type: -1,
    stop_name: 'Victoria St Carpark',
    description: 'Unknown Occupancy',
    timestamp: new Date(0),
    availableSpaces: 0,
    maxSpaces: 895,
  }
}

const agenda21mapper = {
  'Downtown': 'downtown-carpark',
  'Civic': 'civic-carpark',
  'Victoria St': 'victoria-st-carpark',
}

const pullCarparkData = async function() {
  if (!process.env.AGENDA21_API_KEY) {
    return
  }
  const apiKey = process.env.AGENDA21_API_KEY
  const url = 'http://whatthecatbroughtin.com:55533/api/parking/latest-availability?key=' + apiKey
  request(url, function(err, response, body) {
    const data = JSON.parse(body)
    data.forEach((carpark) => {
      const cacheObj = carparks[agenda21mapper[carpark.name]]
      cacheObj.availableSpaces = carpark.availableSpaces
      cacheObj.timestamp = carpark.timestamp
      cacheObj.description = `${carpark.availableSpaces} spaces currently available`
    })
  })
}

const aklStops = {
  extraSources: () => {
    return Promise.resolve(Object.values(carparks))
  },
  getSingle: (code) => {
    if (code in carparks) {
      return Promise.resolve(carparks[code])
    } else {
      return Promise.reject()
    }
  }
}

const init = () => {
  if (global.config.prefix !== 'nz-akl') {
    return
  }
  if (!process.env.AGENDA21_API_KEY) {
    log('nz-akl'.magenta, 'No AGENDA21_API_KEY, will not show latest carpark availability')
  } else {
    // pulls carpark data every 5 mins
    log('nz-akl'.magenta, 'Agenda 21 Activated')
    pullCarparkData()
    setInterval(pullCarparkData, 5 * 60 * 1000)
  }
}
setTimeout(init, 10000)

module.exports = aklStops