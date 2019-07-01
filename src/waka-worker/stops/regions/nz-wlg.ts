import { BaseStops } from '../../../typings'

class StopsNZWLG extends BaseStops {
  constructor() {
    super({})
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

  start = () => {}

  stop = () => {}

  extraSources = () => {
    return Promise.resolve([])
  }

  filter = (recordset: { stop_id: string }[], mode = 'nothing') => {
    const { badStops } = this
    return recordset
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

export default StopsNZWLG
