const log = require('../../server-common/logger.js')
const config = require('../../config.js')

const at = require('./nz-akl.js')

class Updaters {
  constructor() {
    this.agencies = {
      'nz-akl': new at()
    }
  }
  start() {
    log('Starting Auto Updaters')
    config.autoupdate.forEach(item => {
      this.agencies[item].start()
    })
  }
}
module.exports = Updaters