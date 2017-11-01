const log = require('../../server-common/logger.js')
const config = require('../../config.js')

const at = require('./nz-akl.js')
const metlink = require('./nz-wlg.js')
const tfnsw = require('./au-syd.js')

class Updaters {
  constructor() {
    this.agencies = {
      'nz-akl': new at(),
      'nz-wlg': new metlink(),
      'au-syd': new tfnsw()
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