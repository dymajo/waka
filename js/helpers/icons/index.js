import { icon as Icon } from 'leaflet'
import { normalMetadata } from './normal.js'
import { auSydMetadata } from './au-syd.js'

// this map is from the routeType enum to the filename
// e.g if a stop had the route type 4, it would look for ferry.svg
const routeTypeMap = new Map()
routeTypeMap.set(0, 'lightrail')
routeTypeMap.set(1, 'subway')
routeTypeMap.set(2, 'train')
routeTypeMap.set(3, 'bus')
routeTypeMap.set(4, 'ferry')
routeTypeMap.set(5, 'cablecar')
routeTypeMap.set(6, 'gondola')
routeTypeMap.set(7, 'funicular')
routeTypeMap.set(-1, 'parkingbuilding')
routeTypeMap.set(-2, 'bike')
routeTypeMap.set(200, 'coach')
routeTypeMap.set(400, 'train')
routeTypeMap.set(401, 'subway')
routeTypeMap.set(900, 'lightrail')

const iconStyles = {
  normal: normalMetadata,
  'au-syd': auSydMetadata,
}

class Iconhelper {
  getClassName(prefix, variant) {
    if (variant !== null && prefix === 'normal') {
      return 'currentSelectionIcon larger'
    }
    return ''
  }

  getFileName(prefix, routeType, variant) {
    const pathPrefix = `/icons/${prefix}/`
    const fileType = '.svg'

    // legacy used fill instead of selection
    if (prefix === 'normal' && variant === 'selection') {
      return `${pathPrefix}${routeType}-fill${fileType}`
    }
    return `${pathPrefix}${routeType}${variant ? `-${variant}` : ''}${fileType}`
  }

  getIcon(prefixRequest, routeTypeEnum, variant = null) {
    const icon = {}

    let prefix = 'normal'
    let routeType = this.getRouteType(routeTypeEnum)
    // use the icon if it is defined
    if (
      iconStyles[prefixRequest] !== undefined &&
      iconStyles[prefixRequest][routeType] !== undefined
    ) {
      prefix = prefixRequest
    }
    // fallback to the normal icons, if one exists
    if (iconStyles[prefix][routeType] === undefined) {
      routeType = 'default'
    }

    icon.iconUrl = this.getFileName(prefix, routeType, variant)
    icon.iconSize = this.getSize(prefix, routeTypeEnum, variant)
    icon.className = this.getClassName(prefix, variant)
    return new Icon(icon)
  }

  getSize(prefixRequest, routeTypeEnum, variant = null) {
    // handles the differences between routeTypes
    let routeType = this.getRouteType(routeTypeEnum)
    let defaultIcon = 'default'
    if (variant !== null) {
      routeType += '-selection'
      defaultIcon += '-selection'
    }

    // returns the size of the icon, or uses the default size if not defined
    const prefix =
      iconStyles[prefixRequest] === undefined ? 'normal' : prefixRequest
    let { size } = iconStyles[prefix][defaultIcon]
    if (
      iconStyles[prefix][routeType] !== undefined &&
      iconStyles[prefix][routeType].size !== undefined
    ) {
      ;({ size } = iconStyles[prefix][routeType])
    }
    return [size.width, size.height]
  }

  getRouteType(routeTypeEnum) {
    let routeTypeQuery = routeTypeEnum
    // all trains are trains
    if (routeTypeEnum >= 100 && routeTypeEnum <= 199) {
      routeTypeQuery = 2
    }
    // all coaches are coaches
    if (routeTypeEnum >= 200 && routeTypeEnum <= 299) {
      routeTypeQuery = 200
    }
    // all buses are buses
    if (routeTypeEnum >= 700 && routeTypeEnum <= 799) {
      routeTypeQuery = 3
    }
    if (routeTypeMap.get(routeTypeQuery) === undefined) {
      return 'default'
    }
    return routeTypeMap.get(routeTypeQuery)
  }
}

export default Iconhelper
