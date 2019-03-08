class StopsNZWLG {
  constructor() {
    this.badStops = [
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
  }

  extraSources() {
    return Promise.resolve([])
  }

  filter(recordset, mode = 'nothing') {
    const { badStops } = this.badStops
    recordset
      .filter(item => {
        if (
          mode !== 'keep' &&
          badStops.indexOf(item.stop_id.slice(0, -1)) !== -1 &&
          (item.stop_id.slice(-1) === '2' ||
            (mode === 'delete' && item.stop_id.slice(-1) === '1'))
        ) {
          return false
        }
        return true
      })
      .map(i => {
        const item = i
        if (badStops.indexOf(item.stop_id.slice(0, -1)) !== -1) {
          item.stop_id = item.stop_id.slice(0, -1)
        }
        return item
      })
  }
}

module.exports = StopsNZWLG
