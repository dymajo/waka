import leaflet from 'leaflet'

const Icon = leaflet.icon
const route_type_map = new Map()
route_type_map.set(0, 'lightrail')
route_type_map.set(1, 'subway')
route_type_map.set(2, 'train')
route_type_map.set(3, 'bus')
route_type_map.set(4, 'ferry')
route_type_map.set(5, 'cablecar')
route_type_map.set(6, 'gondola')
route_type_map.set(7, 'funicular')

const style_map = {
  'normal': new Map(),
  'au-syd': new Map(),
}
style_map.normal.set('default', [30, 49])
style_map.normal.set('default-selection', [28, 28])
style_map.normal.set('0-selection', [24, 24])
style_map.normal.set('2-selection', [28, 28])
style_map.normal.set('4-selection', [28, 28])

style_map.normal.set(3,[25, 41])

style_map['au-syd'].set('default', [30, 30])
style_map['au-syd'].set(0, [40, 40])
style_map['au-syd'].set(2, [40, 40])
style_map['au-syd'].set(4, [40, 40])

style_map['au-syd'].set('default-selection', [30, 30])
style_map['au-syd'].set('0-selection', [40, 40])
style_map['au-syd'].set('2-selection', [40, 40])
style_map['au-syd'].set('4-selection', [40, 40])

class iconhelper {

  getClassName(variant, prefix) {
    if (variant !== null && prefix === 'normal') {
      return 'currentSelectionIcon larger'
    }
    return ''
  }

  getFileName(route_type, prefix, variant) {
    let fileName = this.getRouteType(route_type)
    if (prefix === 'normal' && variant === 'selection') {
      return fileName + '-fill'
    }
    return fileName
  }

  getIcon(prefix, route_type, variant = null) {
    const icon = {}
    let variantfile = ''
    let filetype = '.svg'
    
    if (typeof style_map[prefix] === 'undefined') {
      prefix = 'normal'
    }
    if (prefix === 'normal') {
      if (variant === 'selection') {
        filetype = '.svg'
      } else {
        filetype = '.png'
      }
    }
    if (prefix !== 'normal' && variant === 'selection') {
      variantfile = '-selection'
    }


    icon.iconUrl = '/icons/' + prefix + '/' + this.getFileName(route_type, prefix, variant) + variantfile + filetype

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
  getRouteType(route_type){
    return route_type_map.get(route_type)
  } 
}

export default iconhelper