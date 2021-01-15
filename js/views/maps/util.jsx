export const getDist = zoom => {
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

export const getIconName = (region, routeType, context, stopName) => {
  if (region === 'au-syd') {
    // TODO!
    return 'normal-default'
  }

  let prefix = 'normal-'
  if (context === 'VehicleMarker') {
    prefix = 'normal-vehicle-'
  } else if (context === 'SavedStations') {
    prefix = ''
  }

  // the standard icons
  if (routeType === 2) {
    return `${prefix}train`
  }

  if (routeType === 3) {
    // dynamic bus icons
    if (context !== 'VehicleMarker' && context !== 'SavedStations') {
      const stopSplit = stopName.split('Stop')
      const platformSplit = stopName.split('Platform')
      let markericon = null
      if (stopSplit.length > 1 && stopSplit[1].trim().length > 0) {
        markericon = stopSplit[1]
      } else if (
        platformSplit.length > 1 &&
        platformSplit[1].trim().length > 0
      ) {
        markericon = platformSplit[1]
      }

      if (markericon != null) {
        let name = markericon
          .trim()
          .replace(/\)/g, '')
          .replace(/\(/g, '')
        if (name.substring(3, 4) === ' ' || name.length === 3) {
          name = name.substring(0, 3)
        } else if (name.substring(2, 3) === ' ' || name.length === 2) {
          name = name.substring(0, 2)
        } else {
          name = name.substring(0, 1)
        }
        name = name.replace(/ /g, '').toUpperCase()

        if (['A', 'B', 'C', 'D', 'E', 'F'].includes(name)) {
          return `${prefix}bus-${name.toLowerCase()}`
        }
      }
    }
    return `${prefix}bus`
  }
  if (routeType === 4) {
    return `${prefix}ferry`
  }
  if (routeType === 5) {
    return `${prefix}cablecar`
  }
  if (routeType === -1) {
    return `${prefix}parkingbuilding`
  }

  return `${prefix}default`
}
