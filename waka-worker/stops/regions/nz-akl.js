const fetch = require('node-fetch')

const pricingHtml = `
<ul class="trip-content" style="padding: 0; min-height: 0;">
  <li class="colored-trip" style="background: #3498db;">
    <div class="main">
      <div class="left">
        <h1>$4 <small>per hour</small></h1>
        <h2>Weekdays (6am - Midnight)</h2>
      </div>
    </div>
  </li>
  <li class="colored-trip" style="background: #2980b9;">
    <div class="main">
      <div class="left">
        <h1>$2 <small>per hour</small></h1>
        <h2>Evenings / Weekends</h2>
      </div>
    </div>
  </li>
</ul>
`
const pricingHtmlRonwood = `
<ul class="trip-content" style="padding: 0; min-height: 0;">
  <li class="colored-trip" style="background: #3498db;">
    <div class="main">
      <div class="left">
        <h1>$2 <small>per hour</small></h1>
        <h2>Weekdays (6am - 9pm)</h2>
      </div>
    </div>
  </li>
  <li class="colored-trip" style="background: #2980b9;">
    <div class="main">
      <div class="left">
        <h1>$1 <small>per hour</small></h1>
        <h2>Evenings / Weekends</h2>
      </div>
    </div>
  </li>
</ul>
`

const additionalData = {
  'downtown-carpark': {
    url:
      'https://at.govt.nz/driving-parking/parking-in-auckland/downtown-car-park/',
    twitter: 'https://twitter.com/downtowncarpark',
    html: pricingHtml,
  },
  'civic-carpark': {
    url:
      'https://at.govt.nz/driving-parking/parking-in-auckland/civic-car-park/',
    twitter: 'https://twitter.com/civiccarpark',
    html: pricingHtml,
  },
  'victoria-st-carpark': {
    url:
      'https://at.govt.nz/driving-parking/parking-in-auckland/victoria-st-car-park/',
    twitter: 'https://twitter.com/vicstcarpark',
    html: pricingHtml,
  },
  'ronwood-ave-carpark': {
    url:
      'https://at.govt.nz/driving-parking/find-parking/parking-in-south-auckland/ronwood-ave-car-park/',
    twitter: 'https://twitter.com/ronwoodcarpark',
    html: pricingHtmlRonwood,
  },
}

const agenda21mapper = {
  Downtown: 'downtown-carpark',
  Civic: 'civic-carpark',
  'Victoria St': 'victoria-st-carpark',
  Ronwood: 'ronwood-ave-carpark',
}

class StopsNZAKL {
  constructor(props) {
    const { logger, apiKey } = props
    this.logger = logger
    this.apiKey = apiKey
    this.interval = 0

    this.pullCarparkData = this.pullCarparkData.bind(this)

    this.carparks = {
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
      },
      'ronwood-ave-carpark': {
        stop_id: 'ronwood-ave-carpark',
        stop_lat: -36.99086,
        stop_lon: 174.877677,
        stop_lng: 174.877677, // lng is deprecated
        stop_region: 'nz-akl',
        route_type: -1,
        stop_name: 'Ronwood Ave Carpark',
        description: 'Unknown Occupancy',
        timestamp: new Date(0),
        availableSpaces: 0,
        maxSpaces: 678,
      },
    }
  }

  start() {
    const { logger, apiKey } = this
    if (!apiKey) {
      logger.info(
        'No Agenda 21 AKL API Key, will not show latest carpark availability'
      )
    } else {
      logger.info('Agenda 21 Activated')
      this.pullCarparkData()
      this.interval = setInterval(this.pullCarparkData, 5 * 60 * 1000)
    }
  }

  stop() {
    const { logger } = this
    clearInterval(this.interval)
    logger.info('Agenda 21 Deactivated')
  }

  async pullCarparkData() {
    const { logger, apiKey } = this
    try {
      const response = await fetch(
        `http://whatthecatbroughtin.com:55533/api/parking/latest-availability?key=${apiKey}`
      )
      const data = await response.json()
      data.forEach(carpark => {
        const cacheObj = this.carparks[agenda21mapper[carpark.name]]
        cacheObj.availableSpaces = carpark.availableSpaces
        cacheObj.timestamp = carpark.timestamp
        cacheObj.description = `${
          carpark.availableSpaces
        } spaces currently available`
      })
    } catch (err) {
      // api is offline or whatever. just retries in 5 mins
      logger.warn({ err }, 'Could not get carpark information.')
    }
  }

  extraSources(lat, lng, distance) {
    const latDist = distance / 100000
    const lonDist = distance / 65000

    return Promise.resolve(
      Object.values(this.carparks).filter(
        carpark =>
          lat >= carpark.stop_lat - latDist &&
          lat <= carpark.stop_lat + latDist &&
          carpark.stop_lon >= carpark.stop_lon - lonDist &&
          carpark.stop_lon <= carpark.stop_lon + lonDist
      )
    )
  }

  getSingle(code) {
    if (code in this.carparks) {
      return this.carparks[code]
    }
    throw Error({ message: 'Carpark Not Found!' })
  }

  getTimes(code) {
    if (code in this.carparks) {
      let obj = {
        provider: 'carpark-bot',
        trips: [], // not used but won't crash older versions of client
      }
      obj = Object.assign(obj, this.carparks[code])
      obj = Object.assign(obj, additionalData[code])
      const percent = Math.round((obj.availableSpaces / obj.maxSpaces) * 100)
      if (obj.availableSpaces === 0) {
        return obj
      }
      let emoji = '.'
      if (percent > 80) {
        emoji = ' 😭'
      } else if (percent > 65) {
        emoji = ' 😢'
      } else if (percent > 50) {
        emoji = ' 🙁'
      }
      obj.html += `<div class="error" style="padding: 10px 0 5px;"><p>This carpark is ${percent}% empty${emoji}</p></div>`
      return obj
    }
    return null
  }
}

module.exports = StopsNZAKL
