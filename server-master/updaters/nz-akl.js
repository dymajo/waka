const colors = require('colors')
const request = require('request')
const WorkerManager = require('../workerManager.js')

const log = require('../../server-common/logger.js')

const options = {
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

class Auckland {
  constructor() {
    if (!process.env.atApiKey) {
      log('Auckland Transport API Key not found.')
    }
    this.mappingCheck = this.mappingCheck.bind(this)
  }
  start() {
    log('nz-akl'.magenta, 'Updater Started')

    this.mappingCheck().then(() => {
      this.versionCheck()
    })
    // ironic that I forgot to add a version check
    setInterval(() => {
      this.mappingCheck().then(() => {
        this.versionCheck()
      })
    }, 1800000)
  }
  versionCheck() {
    // checks the versions api
    this.versionRequest().then(data => {
      // creates versions that don't exist
      const creating = []
      const creatingPromises = []
      data.forEach(item => {
        const version = item.version
        if (WorkerManager.get('nz-akl', version) === null) {
          creating.push(version)
          creatingPromises.push(WorkerManager.add({
            prefix: 'nz-akl',
            version: version
          }))
        }
      })
      if (creating.length === 0) {
        return log('nz-akl'.magenta, 'No new versions found.', new Date().toLocaleString())
      }
      Promise.all(creatingPromises).then(() => {
        this.importMultiple(creating).then(() => {
          this.mappingCheck()
        })
      }).catch(err => {
        console.error('failed creation', err)
      })
    }).catch((err) => {
      console.log(err)
      log('nz-akl'.magenta, 'Could not get versions. Will try again later.')
    })
  }
  async importMultiple(versions) {
    // starts worker, imports and then stops
    for (let version of versions) {
      const worker = await WorkerManager.start('nz-akl', version)
      await worker.importLongPromise('all')
      await WorkerManager.stop('nz-akl', version)
    }
  }
  mappingCheck() {
    return new Promise((resolve) => {
      // checks the realtime api
      this.rtRequest().then(realtimeVersion => {
        let currentVersion = 'no-worker'
        const currentWorker = WorkerManager.getWorker(WorkerManager.getMapping('nz-akl'))
        if (currentWorker !== null) {
          currentVersion = currentWorker.config.version 
        }
        
        // looks at the current mapping, and checks if anything should be changed
        if (realtimeVersion === currentVersion) {
          log('nz-akl'.magenta, 'Worker does not need update.', new Date().toLocaleString())
          return
        }

        // starts the worker
        log('nz-akl'.magenta, 'Worker needs re-map.')
        log('Attempting to update', currentVersion.magenta, '=>', realtimeVersion.magenta)


        WorkerManager.start('nz-akl', realtimeVersion).then((worker) => {
          log('Worker started! Running tests.')

          // After all our tests have finished...
          this.testVersion(worker).then(() => {
            log('All tests passed. Activating mapping.')

            WorkerManager.setMapping('nz-akl', realtimeVersion).then(() => {
              if (currentWorker !== null) {
                log('Stopping old worker.')
                WorkerManager.stop('nz-akl', currentVersion).then(resolve)
              }
            })
          }).catch(err => {
            console.error('Tests failure. Will not map.', err)
            WorkerManager.stop('nz-akl', realtimeVersion).then(resolve)
            resolve()
          })
        }).catch(err => {
          if (err === 404) {
            log('nz-akl'.magenta, realtimeVersion.magenta, 'Worker could not be found. Mapper will (hopefully) pick this up later.')
          } else {
            console.error(err)
          }
          resolve()
        })
      }).catch(err => {
        log('nz-akl'.magenta, err, 'Skipping re-map for now.')
        resolve()
      })
    })
  }

  // tests the new mapping
  async testVersion(worker) {
    const port = worker.port
    const tests = []
    tests.push(new Promise((resolve, reject) => {
      if (worker.config.status !== 'imported') {
        reject('Worker has not imported data yet.')
      } else {
        resolve()
      }
    }))
    // checks if there's stops
    tests.push(new Promise((resolve, reject) => {
      request(`http://localhost:${port}/a/station/search?lat=-36.8456&lon=174.7766&distance=250`, function(err, response, body) {
        if (err) {
          return reject(err)
        }
        try {
          JSON.parse(body).length
        } catch(err) {
          return reject(err)
        }
        if (JSON.parse(body).length > 0) {
          resolve()
        } else {
          reject('No items when searching.')
        }
      })
    }))
    tests.push(new Promise((resolve, reject) => {
      request(`http://localhost:${port}/a/station/7148/times/13:00`, function(err, response, body) {
        if (err) {
          return reject(err)
        }
        try {
          JSON.parse(body).trips.length
        } catch(err) {
          return reject(err)
        }
        if (JSON.parse(body).trips.length > 0) {
          resolve()
        } else {
          reject('No items when looking up bus stop 7148.')
        }
      })
    }))
    return Promise.all(tests)
  }
  versionRequest() {
    return new Promise((resolve, reject) => {
      options.url = 'https://api.at.govt.nz/v2/gtfs/versions'
      request(options, function(err, response, body) {
        if (err) {
          return reject(err)
        }
        resolve(JSON.parse(body).response)
      })
    })
  }
  rtRequest() {
    return new Promise((resolve, reject) => {
      options.url = 'https://api.at.govt.nz/v2/public/realtime/tripupdates'
      request(options, function(err, response, body) {
        if (err) {
          return reject('Could not get realtime.')
        }
        let data = JSON.parse(body)
        // if there's data
        if (typeof(data.response) !== 'undefined' && typeof(data.response.entity) !== 'undefined' && data.response.entity.length > 0) {
          const update = data.response.entity[0]
          const newVersion = update.trip_update.trip.trip_id.split('-')[1]
          resolve(newVersion)
        } else {
          reject('No data available.')
        }
      })
    })
  }
}
module.exports = Auckland