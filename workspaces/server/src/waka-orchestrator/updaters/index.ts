import { EnvironmentConfig, WakaConfig } from '../../types'
import logger from '../logger'
import VersionManager from '../versionManager'
import TfNSWUpdater from './au-syd'
import BasicUpdater from './basic'
import Fargate from './fargate'
import Kubernetes from './kubernetes'
import ATUpdater from './nz-akl'

interface UpdateManagerProps {
  config: WakaConfig
  versionManager: VersionManager
}

interface Importer {
  startTask: (env: EnvironmentConfig) => void
}

class UpdateManager {
  config: WakaConfig
  versionManager: VersionManager
  updaters: { [prefix: string]: {} }
  interval: NodeJS.Timeout
  importer: Importer

  constructor(props: UpdateManagerProps) {
    const { config, versionManager } = props
    this.config = config
    this.versionManager = versionManager
    const { importer } = config

    this.importer = null
    if (importer) {
      if (importer.provider === 'fargate') {
        this.importer = new Fargate(importer)
      } else if (importer.provider === 'kubernetes') {
        this.importer = new Kubernetes(importer)
      }
    }

    this.updaters = {}
  }

  start = () => {
    const { callback, config, versionManager } = this
    const { updaters } = config
    const regions = Object.keys(updaters).filter(k => updaters[k] !== false)
    if (regions.length === 0) {
      logger.info(
        'No updaters are turned on. Waka will not update automatically.'
      )
    }
    regions.forEach(prefix => {
      const updaterConfig = updaters[prefix]
      if (updaterConfig !== false) {
        const { url, delay, interval, type, extended } = updaterConfig
        logger.info({ prefix, type }, 'Starting Updater')

        let updater
        if (type === 'nz-akl') {
          const apiKey = config.api['nz-akl']
          const params = { prefix, apiKey, delay, interval, callback, extended }
          updater = new ATUpdater(params)
        } else if (type === 'au-syd') {
          const apiKey = config.api['au-syd']
          const params = {
            prefix,
            apiKey,
            delay,
            interval,
            callback,
            versionManager,
            extended,
            config,
          }
          updater = new TfNSWUpdater(params)
        } else {
          const params = { prefix, url, delay, interval, callback, extended }
          updater = new BasicUpdater(params)
        }

        updater.start()
        this.updaters[prefix] = updater
      }
    })

    // check the versions for remappings
    setTimeout(this.checkVersions, 1 * 30 * 1000) // initially after 30 seconds
    this.interval = setInterval(this.checkVersions, 10 * 60 * 1000) // then every 10 mins
  }

  stop = () => {
    setInterval(this.checkVersions)
  }

  callback = async (
    prefix: string,
    version: string,
    adjustMapping: boolean
  ) => {
    const { config, versionManager } = this
    // don't understand this
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
        // this is shit
        newRealtime: prefix !== 'nz-wlg',
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
      // we can't run it because if callback is run twice, it'll start all the tasks twice probably
    } else if (
      (adjustMapping === true && newStatus === 'imported') ||
      newStatus === 'imported-willmap'
    ) {
      logger.info({ prefix, version }, 'Import is complete - updating mapping.')
      versionManager.updateMapping(prefix, id)
      versionManager.updateVersionStatus(id, 'imported')
    }
  }

  checkVersions = async () => {
    const { versionManager, importer } = this
    const allVersions = await versionManager.allVersions()
    Object.keys(allVersions).forEach(async id => {
      const version = allVersions[id]
      const { prefix, status } = version
      if (status === 'pendingimport' || status === 'pendingimport-willmap') {
        if (this.importer === null) {
          logger.info(
            { prefix, version: version.version },
            'No Importer Configured - Please open /private and do a manual import.'
          )
        } else {
          logger.info({ prefix, version: version.version }, 'Starting Import')
          const config = await versionManager.getVersionConfig(id)
          const env = versionManager.envMapper.toEnvironmental(
            config,
            'importer'
          )
          await importer.startTask(env)
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
export default UpdateManager
