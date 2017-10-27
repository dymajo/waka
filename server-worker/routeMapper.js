const route_type_map = new Map()
route_type_map.set(0, 'lightrail')
route_type_map.set(2, 'sydneytrains')
route_type_map.set(3, 'buses')
route_type_map.set(4, 'ferries')


const mode_type_map = new Map()
route_type_map.forEach((value, key) => {
  mode_type_map.set(value, key)
})


const routeMapper = {
  route: function(mode) {
    return route_type_map.get(mode)
  },
  mode: function(route) {
    return mode_type_map.get(route)
  }
}


module.exports = routeMapper