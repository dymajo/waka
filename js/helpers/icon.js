import leaflet from 'leaflet'

const Icon = leaflet.icon
const route_type_map = new Map()
route_type_map.set(0, 'lightrail')
route_type_map.set(1, 'train')
route_type_map.set(2, 'train')
route_type_map.set(3, 'bus')
route_type_map.set(4, 'ferry')
route_type_map.set(5, 'cablecar')
route_type_map.set(6, 'gondola')
route_type_map.set(7, 'cablecar')
route_type_map.set(-1, 'parkingbuilding')
route_type_map.set(-2, 'bike')
route_type_map.set(100, 'train')
route_type_map.set(101, 'High Speed Rail')
route_type_map.set(102, 'Long Distance Trains')
route_type_map.set(103, 'Inter Regional Rail')
route_type_map.set(104, 'Car Transport Rail')
route_type_map.set(105, 'Sleeper Rail')
route_type_map.set(106, 'Regional Rail')
route_type_map.set(107, 'Tourist Railway')
route_type_map.set(108, 'Rail Shuttle (Within Complex)')
route_type_map.set(109, 'Suburban Railway')
route_type_map.set(110, 'Replacement Rail')
route_type_map.set(111, 'Special Rail')
route_type_map.set(112, 'Lorry Transport Rail')
route_type_map.set(113, 'All Rails')
route_type_map.set(114, 'Cross-Country Rail')
route_type_map.set(115, 'Vehicle Transport Rail')
route_type_map.set(116, 'Rack and Pinion Railway')
route_type_map.set(117, 'Additional Rail')
route_type_map.set(200, 'Coach')
route_type_map.set(201, 'International Coach')
route_type_map.set(202, 'National Coach')
route_type_map.set(203, 'Shuttle Coach')
route_type_map.set(204, 'Regional Coach')
route_type_map.set(205, 'Special Coach')
route_type_map.set(206, 'Sightseeing Coach')
route_type_map.set(207, 'Tourist Coach')
route_type_map.set(208, 'Commuter Coach')
route_type_map.set(209, 'All Coachs')
route_type_map.set(400, 'train') // urban railway
route_type_map.set(401, 'train') // metro
route_type_map.set(402, 'Underground')
route_type_map.set(403, 'train') // urban railway
route_type_map.set(404, 'All Urban Railways')
route_type_map.set(405, 'Monorail')
route_type_map.set(700, 'bus')
route_type_map.set(701, 'Regional Bus')
route_type_map.set(702, 'Express Bus')
route_type_map.set(703, 'Stopping Bus')
route_type_map.set(704, 'Local Bus')
route_type_map.set(705, 'Night Bus')
route_type_map.set(706, 'Post Bus')
route_type_map.set(707, 'Special Needs Bus')
route_type_map.set(708, 'Mobility Bus')
route_type_map.set(709, 'Mobility Bus for Registered Disabled')
route_type_map.set(710, 'Sightseeing Bus')
route_type_map.set(711, 'Shuttle Bus')
route_type_map.set(712, 'bus')
route_type_map.set(713, 'School and Public Bus')
route_type_map.set(714, 'Rail Replacement Bus')
route_type_map.set(715, 'Demand and Response Bus')
route_type_map.set(716, 'All Buss')
route_type_map.set(717, 'Share Taxi')
route_type_map.set(800, 'Trolleybus')
route_type_map.set(900, 'Tram')
route_type_map.set(901, 'City Tram')
route_type_map.set(902, 'Local Tram')
route_type_map.set(903, 'Regional Tram')
route_type_map.set(904, 'Sightseeing Tram')
route_type_map.set(905, 'Shuttle Tram')
route_type_map.set(906, 'All Trams')
route_type_map.set(907, 'Cable Tram')
route_type_map.set(1000, 'ferry')
route_type_map.set(1100, 'Air')
route_type_map.set(1200, 'Ferry')
route_type_map.set(1300, 'telecabin')
route_type_map.set(1400, 'cablecar')
route_type_map.set(1500, 'Taxi')
route_type_map.set(1501, 'Communal Taxi')
route_type_map.set(1502, 'Water Taxi')
route_type_map.set(1503, 'Rail Taxi')
route_type_map.set(1504, 'Bike Taxi')
route_type_map.set(1505, 'Licensed Taxi')
route_type_map.set(1506, 'Private Hire Vehicle')
route_type_map.set(1507, 'All Taxis')
route_type_map.set(1700, 'Miscellaneous')

const style_map = {
  normal: new Map(),
  'au-syd': new Map(),
}
style_map.normal.set('default', [30, 49])
style_map.normal.set('default-selection', [28, 28])
style_map.normal.set('0-selection', [24, 24])
style_map.normal.set('2-selection', [28, 28])
style_map.normal.set('4-selection', [28, 28])

style_map.normal.set(-1, [28, 28])
style_map.normal.set(-2, [26, 32])
style_map.normal.set(2, [28, 34])
style_map.normal.set(3, [26, 32])
style_map.normal.set(4, [28, 34])
style_map.normal.set(5, [28, 34])

style_map['au-syd'].set('default', [30, 30])
style_map['au-syd'].set(0, [40, 40])
style_map['au-syd'].set(2, [40, 40])
style_map['au-syd'].set(4, [40, 40])
style_map['au-syd'].set(700, [40, 40])
style_map['au-syd'].set(712, [40, 40])

style_map['au-syd'].set('default-selection', [30, 30])
style_map['au-syd'].set('0-selection', [40, 40])
style_map['au-syd'].set('2-selection', [40, 40])
style_map['au-syd'].set('4-selection', [40, 40])

class Iconhelper {
  getClassName(variant, prefix) {
    if (variant !== null && prefix === 'normal') {
      return 'currentSelectionIcon larger'
    }
    return ''
  }

  getFileName(route_type, prefix, variant) {
    const fileName = this.getRouteType(route_type)
    console.log(fileName)
    if (prefix === 'normal' && variant === 'selection') {
      return `${fileName}-fill`
    }
    return fileName
  }

  getIcon(prefix, route_type, variant = null) {
    if (route_type >= 100 && route_type <= 199) {
      route_type = 2
    }

    const icon = {}
    let variantfile = ''
    const filetype = '.svg'

    if (typeof style_map[prefix] === 'undefined') {
      prefix = 'normal'
    }
    if (prefix !== 'normal' && variant === 'selection') {
      variantfile = '-selection'
    }

    icon.iconUrl = `/icons/${prefix}/${this.getFileName(
      route_type,
      prefix,
      variant
    )}${variantfile}${filetype}`

    icon.iconSize = this.getSize(route_type, prefix, variant)

    icon.className = this.getClassName(variant, prefix)
    return new Icon(icon)
  }

  getSize(route_type, prefix, variant = null) {
    if (variant !== null) {
      if (route_type !== 0 && route_type !== 2 && route_type !== 4) {
        route_type = 'default-selection'
      } else {
        route_type += '-selection'
      }
    }
    if (typeof style_map[prefix] === 'undefined') {
      prefix = 'normal'
    }
    if (typeof style_map[prefix].get(route_type) !== 'undefined') {
      return style_map[prefix].get(route_type)
    }
    return style_map[prefix].get('default')
  }

  getRouteType(route_type) {
    return route_type_map.get(route_type)
  }
}

export default Iconhelper
