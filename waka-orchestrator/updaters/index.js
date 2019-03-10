const logger = require('../logger.js')
const BasicUpdater = require('./basic.js')

class UpdateManager {
  constructor(props) {
    const { config, versionManager } = props
    this.config = config
    this.versionManager = versionManager

    this.updaters = {}
    this.callback = this.callback.bind(this)
  }

  start() {
    const { callback, config } = this
    const { updaters } = config
    const regions = Object.keys(updaters).filter(k => updaters[k] !== false)

    if (regions.length === 0) {
      logger.info(
        'No updaters are turned on. Waka will not update automatically.'
      )
    }

    regions.forEach(prefix => {
      logger.info({ prefix, type: updaters[prefix].type }, 'Starting Updater')
      const { url, delay, interval } = updaters[prefix]
      const params = { prefix, url, delay, interval, callback }
      const updater = new BasicUpdater(params)
      updater.start()
      this.updaters[prefix] = updater
    })
  }

  async callback(prefix, version, adjustMapping) {
    const { config, versionManager } = this
    const { shapesContainer, shapesRegion, dbconfig } = config.updaters[prefix]

    // the id should be the same as the one generated from addVersion
    const { id, exists } = await versionManager.checkVersionExists(
      prefix,
      version
    )
    if (exists) {
      logger.info({ prefix, version }, 'Version already exists in database.')
    } else {
      // Add the version with the default config for the importer if it doesn't already exist.
      await versionManager.addVersion({
        prefix,
        version,
        shapesContainer,
        shapesRegion,
        dbconfig,
      })
      logger.info({ prefix, version, status: 'empty' }, 'Created empty worker.')

      const newStatus = adjustMapping
        ? 'pendingimport-willmap'
        : 'pendingimport'
      await versionManager.updateVersionStatus(id, newStatus)
      logger.info(
        { prefix, version, status: newStatus },
        'Set status of worker.'
      )
    }

    const { status } = await versionManager.getVersionConfig(id)
    if (status === 'pendingimport' || status === 'pendingimport-willmap') {
      if (adjustMapping === true && status === 'pendingimport') {
        await versionManager.updateVersionStatus(id, 'pendingimport-willmap')
        logger.info(
          { prefix, version, status: 'pendingimport-willmap' },
          'Adjusted status from pendingimport to pendingimport-willmap.'
        )
      }

      console.log('TODO: Trigger Import on Fargate.')
    } else if (
      (adjustMapping === true && status === 'imported') ||
      status === 'imported-willmap'
    ) {
      logger.info({ prefix, version }, 'Import is complete - updating mapping.')
      versionManager.updateMapping(prefix, id)
    }
  }
}
module.exports = UpdateManager
