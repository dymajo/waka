const logger = require('../logger.js')
const Fargate = require('./fargate.js')
const BasicUpdater = require('./basic.js')
const ATUpdater = require('./nz-akl.js')
const TfNSWUpdater = require('./au-syd.js')

class UpdateManager {
  constructor(props) {
    const { config, versionManager } = props
    this.config = config
    this.versionManager = versionManager
    const { importer } = config

    this.fargate = null
    if (importer && importer.provider === 'fargate') {
      this.fargate = new Fargate(importer)
    }

    this.updaters = {}
    this.callback = this.callback.bind(this)
    this.checkVersions = this.checkVersions.bind(this)
  }

  start() {
    const { callback, config, versionManager } = this
    const { updaters } = config
    const regions = Object.keys(updaters).filter(k => updaters[k] !== false)
    if (regions.length === 0) {
      logger.info(
        'No updaters are turned on. Waka will not update automatically.'
      )
    }

    regions.forEach(prefix => {
      const { url, delay, interval, type } = updaters[prefix]
      logger.info({ prefix, type }, 'Starting Updater')

      let updater
      if (prefix === 'nz-akl') {
        const apiKey = config.api['nz-akl']
        const params = { prefix, apiKey, delay, interval, callback }
        updater = new ATUpdater(params)
      } else if (prefix === 'au-syd') {
        const apiKey = config.api['au-syd']
        const params = {
          prefix,
          apiKey,
          delay,
          interval,
          callback,
          versionManager,
        }
        updater = new TfNSWUpdater(params)
      } else {
        const params = { prefix, url, delay, interval, callback }
        updater = new BasicUpdater(params)
      }

      updater.start()
      this.updaters[prefix] = updater
    })

    // check the versions for remappings
    setTimeout(this.checkVersions, 1 * 60 * 1000) // initially after a minute
    this.interval = setInterval(this.checkVersions, 10 * 60 * 1000) // then every 10 mins
  }

  stop() {
    setInterval(this.checkVersions)
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
    }

    const { status } = await versionManager.getVersionConfig(id)
    if (status === 'empty') {
      const newStatus = adjustMapping
        ? 'pendingimport-willmap'
        : 'pendingimport'
      await versionManager.updateVersionStatus(id, newStatus)
      logger.info(
        { prefix, version, status: newStatus },
        'Set status of worker.'
      )
    }

    const newStatus = (await versionManager.getVersionConfig(id)).status
    if (
      newStatus === 'pendingimport' ||
      newStatus === 'pendingimport-willmap'
    ) {
      if (adjustMapping === true && newStatus === 'pendingimport') {
        await versionManager.updateVersionStatus(id, 'pendingimport-willmap')
        logger.info(
          { prefix, version, status: 'pendingimport-willmap' },
          'Adjusted status from pendingimport to pendingimport-willmap.'
        )
      }
      // checkVersions() running on the interval will pick this up
    } else if (
      (adjustMapping === true && newStatus === 'imported') ||
      newStatus === 'imported-willmap'
    ) {
      logger.info({ prefix, version }, 'Import is complete - updating mapping.')
      versionManager.updateMapping(prefix, id)
      versionManager.updateVersionStatus(id, 'imported')
    }
  }

  async checkVersions() {
    const { versionManager, fargate } = this
    const allVersions = await versionManager.allVersions()
    Object.keys(allVersions).forEach(async id => {
      const version = allVersions[id]
      const { prefix, status } = version
      if (status === 'pendingimport' || status === 'pendingimport-willmap') {
        if (this.fargate === null) {
          logger.info(
            { prefix, version: version.version },
            'No Fargate Configured - Please open /private and do a manual import.'
          )
        } else {
          logger.info({ prefix, version: version.version }, 'Starting Import')
          const environment = await versionManager.getFargateVariables(id)
          fargate.startTask(environment)
        }
      } else if (version.status === 'imported-willmap') {
        logger.info(
          { prefix, version: version.version },
          'Import is complete - updating mapping.'
        )
        versionManager.updateMapping(prefix, id)
        versionManager.updateVersionStatus(id, 'imported')
      }
    })
  }
}
module.exports = UpdateManager
