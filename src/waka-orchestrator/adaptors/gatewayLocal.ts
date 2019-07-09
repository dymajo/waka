import { Router } from 'express'
import logger from '../logger'
import WakaWorker from '../../waka-worker'
import { WorkerConfig } from '../../typings'
import BaseGateway from '../../types/BaseGateway'

class GatewayLocal extends BaseGateway {
  router: Router
  workers: {}
  constructor() {
    super()
    this.router = Router()
    this.workers = {}
  }

  async start(prefix: string, config: WorkerConfig) {
    // This is a bit magic - it simply instantiates the WakaWorker class

    const { router, workers } = this
    const oldWorker = workers[prefix]
    const newWorker = new WakaWorker(config)

    // If there's already something on the same prefix,
    // We need to clean it up.
    if (oldWorker !== undefined) {
      logger.info(
        { prefix },
        'Route has already been bound - stopping old route.'
      )
      oldWorker.stop()
    }
    workers[prefix] = newWorker
    newWorker.start()
    logger.info({ prefix }, 'Local Gateway Started.')

    // If there's no route, we simply add it to the router
    // This weird middleware exists because express does not support
    // removing items from the router (can cause issues with in-flight requests)
    // However, it does not matter for local dev.
    if (oldWorker === undefined) {
      router.use(`/${prefix}`, (req, res, next) => {
        if (workers[prefix]) {
          workers[prefix].router(req, res, next)
        } else {
          next()
        }
      })
    }
  }

  async recycle(prefix: string, config: WorkerConfig) {
    this.stop(prefix)
    this.start(prefix, config)
  }

  async stop(prefix: string) {
    const { workers } = this
    if (workers[prefix] !== undefined) {
      workers[prefix].stop()
      delete workers[prefix]
      logger.info({ prefix }, 'Local Gateway Stopped.')
    } else {
      logger.warn({ prefix }, 'Could not stop - could not find worker.')
    }
  }
}
export default GatewayLocal
