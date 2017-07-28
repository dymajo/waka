const sql = require('mssql')
const connection = require('./connection.js')
const extract = require('extract-zip')
const csvparse = require('csv-parse')
const transform = require('stream-transform')
const fs = require('fs')
const path = require('path')

const schemas = {
  agency: ['prefix', 'version', 'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone', 'agency_fare_url', 'agency_email'],
  stop_times: ['prefix', 'version', 'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'stop_headsign', 'pickup_type', 'drop_off_type', 'shape_dist_traveled', 'timepoint']
}

class gtfsImport {
  unzip(location) {
    return new Promise(function(resolve, reject) {
      console.info('Unzipping GTFS Data')
      extract(location, {dir: path.resolve(location + 'unarchived')}, function (err) {
        if (err) {
          return reject(err)
        }
        console.info('Unzip Success!')
        resolve()
      })
    })
  }

  getTable(name) {
    const table = new sql.Table(name)
    table.create = true
    if (name === 'agency') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false, primary: true})
      table.columns.add('version', sql.VarChar(50), {nullable: false, primary: true})
      table.columns.add('agency_id', sql.VarChar(50), {nullable: false, primary: true})
      table.columns.add('agency_name', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_url', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_timezone', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_lang', sql.VarChar(50), {nullable: true})
      table.columns.add('agency_phone', sql.VarChar(50), {nullable: true})
      table.columns.add('agency_fare_url', sql.VarChar(100), {nullable: true})
      table.columns.add('agency_email', sql.VarChar(50), {nullable: true})
      return table
    } else if (name === 'stop_times') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('trip_id', sql.VarChar(100), {nullable: false})
      table.columns.add('arrival_time', sql.VarChar(50), {nullable: false})
      table.columns.add('departure_time', sql.VarChar(50), {nullable: false})
      table.columns.add('stop_id', sql.VarChar(50), {nullable: false})
      table.columns.add('stop_sequence', sql.Int, {nullable: false})
      table.columns.add('stop_headsign', sql.VarChar(50), {nullable: true})
      table.columns.add('pickup_type', sql.Int, {nullable: true})
      table.columns.add('drop_off_type', sql.Int, {nullable: true})
      table.columns.add('shape_dist_traveled', sql.VarChar(50), {nullable: true})
      table.columns.add('timepoint', sql.Int, {nullable: true})
      return table
    } else {
      return null
    }
  }

  _mapRowToRecord(row, rowSchema, tableSchema) {
    return tableSchema.map(column => {
      return row[rowSchema[column]] || null
    })
  }

  upload(location, config, prefix, version) {
    let table = this.getTable(config.table)
    if (table === null) return

    const logstr = config.table + ' ' + prefix + ' ' + version + ' :'

    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(path.resolve(location, config.name))
      const parser = csvparse({delimiter: ','})
      let headers = null
      let transactions = 0
      let totalTransactions = 0

      const commit = function(table) {
        return new Promise((resolve, reject) => {
          connection.get().request().bulk(table, (err, result) => {
            if (err) return reject(err)
            resolve(result)
          })
        })
      }

      const transformer = transform((row, callback) => {
        // builds the csv headers for easy access later
        if (headers === null) {
          headers = {}
          row.forEach(function(item, index) {
            headers[item] = index
          })
          return callback(null)
        }

        const processRow = () => {
          if (row && row.length > 1) {
            const record = this._mapRowToRecord(row, headers, schemas[config.table])
            record[0] = prefix
            record[1] = version

            table.rows.add(...record)

            transactions++
            totalTransactions++
          }
        }

        // assembles our CSV into JSON
        if (transactions < 100000) {
          processRow()
          callback(null)
        } else {
          console.log(logstr, totalTransactions/1000 + 'k Transactions')
          commit(table).then(() => {
            console.log(logstr, 'Committed.')
            transactions = 0

            table = this.getTable(config.table)
            processRow()
            callback(null)

          }).catch((err) => {
            console.log('error')
          })
        }
      }, {parallel: 1})
      transformer.on('finish', () => {
        console.log(logstr, Math.round(totalTransactions/1000) + 'k Transactions')
        commit(table).then(() => {
          console.log(logstr, 'Committed.')
          resolve()
        })
      })

      input.pipe(parser).pipe(transformer)
    })
  }
}
module.exports = gtfsImport