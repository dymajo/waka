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

export const getIconName = (region, routeType) => {
  if (region === 'au-syd') {
    // TODO!
    return 'normal-default'
  }

  // the standard icons
  if (routeType === 2) {
    return 'normal-train'
  } else if (routeType === 3) {
    return 'normal-bus'
  } else if (routeType === 4) {
    return 'normal-ferry'
  } else if (routeType === 5) {
    return 'normal-cablecar'
  } else if (routeType === -1) {
    return 'normal-parkingbuilding'
  } else {
    return 'normal-default'
  }
}
