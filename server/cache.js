var azure = require('azure-storage');
var request = require('request')
var moment = require('moment-timezone')
var fs = require('fs')
const extract = require('extract-zip')
const csvparse = require('csv-parse')
const transform = require('stream-transform')

const Queue = require('./queue.js')
const path = require('path')

const at = require('./agencies/at.js')

var tableSvc = azure.createTableService()

const sql = require('mssql')
const connection = require('./db/connection.js')
const gtfsImport = require('./db/gtfs-import.js')

const zipLocation = path.resolve(__dirname, '../cache/at.zip')

var options = {
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

let firstRun = true

var cache = {
  // current AT versions
  versions: {},

  check: function(cb) {
    tableSvc.createTableIfNotExists('meta', function(error) {
      if (error) {
        console.log(error)
      }

      if (firstRun) {
        connection.isReady.then(() => {
          cache.ready['nz-wlg'].forEach(fn => fn())
        })
      }
      

      options.url = 'https://api.at.govt.nz/v2/gtfs/versions'
      request(options, function(err, response, body) {
        var data = JSON.parse(body)
        cache.versions = {}

        data.response.forEach(function(version) {
          cache.versions[version.version] = {startdate: version.startdate, enddate: version.enddate}
        })


        let runCb = function() {
          if (firstRun) {
            // run all the callbacks
            cache.ready['nz-akl'].forEach(function(fn) {
              fn()
            })
            firstRun = false
          }
        }

        // the magic - we check against the api to choose the correct version
        cache.chooseVersion().then(() => {
          tableSvc.retrieveEntity('meta', 'all', 'cache-version', function(err, result, response) {
            if (result === null) {
              console.log('building the cache for the first time')
              importAt().then(() => {
                console.log('Import Success')
                runCb()
              })
            // objects are not equal, so we need to do a cache rebuild
            // } else if (!deepEqual(cache.versions, JSON.parse(result.version._))) {
              
            } else {
              for (let version in JSON.parse(result.version._)) {
                delete cache.versions[version]
              }
              if (JSON.stringify(cache.versions) === '{}') {
                console.log('nz-akl:'.green, new Date().toLocaleString(), 'cache update not required')
                cache.versions = Object.assign(cache.versions, JSON.parse(result.version._))
                runCb()

              } else {
                console.log('nz-akl:'.green, 'cache needs rebuild', '\nnew:', cache.versions, '\nold:', JSON.parse(result.version._))
                cache.versions = Object.assign(cache.versions, JSON.parse(result.version._))
                importAt().then(() => {
                  console.log('Import Success')
                  runCb()
                })
              }
            }
          })
        })
      })
    })
  },
  currentVersionString: null,
  chooseVersion: function() {
    return new Promise((resolve, reject) => {
      const time = moment().tz('Pacific/Auckland')
      const currentDate = moment(Date.UTC(time.year(), time.month(), time.date(), 0, 0))
      let currentVersion = null
      Object.keys(cache.versions).forEach(function(version) {
        if (moment.utc(cache.versions[version].startdate).isBefore(currentDate) &&
          moment.utc(cache.versions[version].enddate).add(1, 'days').isAfter(currentDate)) {
          if (currentVersion !== null) {
            if (moment.utc(cache.versions[version].startdate).isAfter(moment.utc(cache.versions[currentVersion].startdate))) {
              currentVersion = version
            }
          } else {
            currentVersion = version  
          }
        }
      })
      if (currentVersion === null) {
        currentVersion = Object.keys(cache.versions)[0]
      }
      cache.currentVersionString = currentVersion

      // Now that we've tried to figure out the current version, lets go to AT and see the real current version
      options.url = 'https://api.at.govt.nz/v2/public/realtime/tripupdates'
      request(options, function(err, response, body) {
        if (err) {
          console.warn(err)
          return resolve()
        }
        let data = JSON.parse(body)
        // if there's data
        if (typeof(data.response) !== 'undefined' && typeof(data.response.entity) !== 'undefined' && data.response.entity.length > 0) {
          const update = data.response.entity[0]
          const newVersion = update.trip_update.trip.trip_id.split('-')[1]
          cache.currentVersionString = newVersion
          console.log('nz-akl:'.green, 'version', newVersion)
        } else {
          console.log('the buses have gone to sleep at', new Date().toLocaleString())
        }
        resolve()
      })
    })
  },
  currentVersion: function(prefix = 'nz-akl') {
    if (prefix === 'nz-wlg') {
      return '20170828_20170808-090059'
    }
    return cache.currentVersionString
  },

  ready: {
    'nz-akl': [],
    'nz-wlg': [],
  }
}

function downloadAt() {
  return new Promise(function(resolve, reject) {
    options.url = 'https://atcdn.blob.core.windows.net/data/gtfs.zip'
    console.log('Downloading GTFS Data from AT')
    const gtfsRequest = request(options).pipe(fs.createWriteStream(zipLocation))
    gtfsRequest.on('finish', function() {
      console.log('Finished Downloading GTFS Data')
      resolve()
    })
  })
}

async function importAt() {
  const importer = new gtfsImport()
  await downloadAt()
  await importer.unzip(zipLocation)

  // Finds the versions to add to the DB, and those that are already added.
  const version = Object.keys(cache.versions)
  const sqlRequest = connection.get().request()
  const result = await sqlRequest.query(`select version from versions where prefix = 'nz-akl'`)
  const ignoreVersions = result.recordset.map(item => item.version)

  for (let file of at.files) {
    await importer.upload(zipLocation + 'unarchived', file, at.prefix, version, ignoreVersions)
  }

  // It was a success
  for (let v in version) {
    const vRequest = connection.get().request()
    sqlRequest.input('prefix', sql.VarChar(50), at.prefix)
    sqlRequest.input('version', sql.VarChar(50), version[v])
    await sqlRequest.query(`
      IF NOT EXISTS (SELECT * FROM versions 
         WHERE prefix = @prefix
         AND version = @version)
      BEGIN
         INSERT INTO versions (prefix, version)
         VALUES (@prefix, @version)
      END
    `)
  }

  const versionKey = {
    PartitionKey: {'_':'all'},
    RowKey: {'_': 'cache-version'},
    version: {'_': JSON.stringify(cache.versions)}
  }
  tableSvc.insertOrReplaceEntity('meta', versionKey, function (error, result, response) {
    if (error) {
      console.log(error)
    }
    console.log('saved new meta version')
  })

  return 'Success!'
}
module.exports = cache