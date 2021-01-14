export const getDist = (zoom) => {
  let screensize = document.body.offsetWidth
  if (document.body.offsetHeight > screensize) {
    screensize = document.body.offsetHeight
  }
  let dist = Math.ceil(0.2 * screensize)
  if (zoom <= 17 && zoom > 16) {
    dist = Math.ceil(0.45 * screensize)
  } else if (zoom <= 16) {
    dist = Math.ceil(0.8 * screensize)
  }
  // max the api will handle is 1250
  if (dist > 1250) {
    dist = 1250
  }
  return dist
}

export const getIconName = (region, routeType, context) => {
  if (region === 'au-syd') {
    // TODO!
    return 'normal-default'
  }

  let prefix = 'normal'
  if (context === 'VehicleMarker') {
    prefix = 'normal-vehicle'
  }

  // the standard icons
  if (routeType === 2) {
    return `${prefix}-train`
  } else if (routeType === 3) {
    return `${prefix}-bus`
  } else if (routeType === 4) {
    return `${prefix}-ferry`
  } else if (routeType === 5) {
    return `${prefix}-cablecar`
  } else if (routeType === -1) {
    return `${prefix}-parkingbuilding`
  } else {
    return `${prefix}-default`
  }
}
