const carparks = {
  'Downtown': {
    stop_id: 'downtown-carpark', 
    stop_lat: -36.843621,
    stop_lng: 174.764136,
    stop_region: 'nz-akl',
    route_type: -1,
    stop_name: 'Downtown Carpark',
    timestamp: new Date(0),
    availableSpaces: 0,
    maxSpaces: 1944,
  },
  'Civic': {
    stop_id: 'civic-carpark',
    stop_lat: -36.852857, 
    stop_lng: 174.762732,
    stop_region: 'nz-akl',
    route_type: -1,
    stop_name: 'Civic Carpark',
    timestamp: new Date(0),
    availableSpaces: 0,
    maxSpaces: 928,
  },
  'Victoria St': {
    stop_id: 'victoria-st-carpark',
    stop_lat: -36.849001,
    stop_lng: 174.766549,
    stop_region: 'nz-akl',
    route_type: -1,
    stop_name: 'Victoria St Carpark',
    timestamp: new Date(0),
    availableSpaces: 0,
    maxSpaces: 895,
  }
}

const aklStops = {
  extraSources: () => {
    return Promise.resolve(Object.values(carparks))
  }
}
module.exports = aklStops