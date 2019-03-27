const { Router } = require('express')
const logger = require('../logger.js')
const WakaWorker = require('../../waka-worker/index.js')

class GatewayLocal {
  constructor() {
    this.router = new Router()
    this.workers = {}
  }

  start(prefix, config) {
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

  stop(prefix) {
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
module.exports = GatewayLocal
