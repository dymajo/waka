const badStops = [
  'WATE',
  'WOBU',
  'PETO',
  'TAKA',
  'REDW',
  'TAWA',
  'PORI',
  'TAIT',
  'NGAI',
  'KHAN',
  'MANA',
  'PLIM',
  'PAEK',
  'PARA',
]

module.exports = {
  badStops: badStops,
  filter: function(recordset, mode = 'nothing') {
    return recordset.filter(item => {
      if (badStops.indexOf(item.stop_id.slice(0, -1)) !== -1 && 
        (item.stop_id.slice(-1) === '2' || (mode === 'delete' && item.stop_id.slice(-1) === '1'))) {
        return false
      }
      return true
    }).map(item => {
      if (badStops.indexOf(item.stop_id.slice(0, -1)) !== -1) {
        item.stop_id = item.stop_id.slice(0,-1)
      }
      return item
    })
  }
}