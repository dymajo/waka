const sql = require('mssql')
const connection = require('./connection.js')
const extract = require('extract-zip')
const csvparse = require('csv-parse')
const transform = require('stream-transform')
const fs = require('fs')
const path = require('path')

const schemas = {
  agency: ['prefix', 'version', 'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone', 'agency_fare_url', 'agency_email'],
  stops: ['prefix','version','stop_id','stop_code','stop_name','stop_desc','stop_lat','stop_lon','zone_id','stop_url','location_type','parent_station','stop_timezone','wheelchair_boarding'],
  routes: ['prefix','version','route_id','agency_id','route_short_name','route_long_name','route_desc','route_type','route_url','route_color','route_text_color'],
  trips: ['prefix','version','route_id','service_id','trip_id','trip_headsign','trip_short_name','direction_id','block_id','shape_id','wheelchair_accessible','bikes_allowed'],
  stop_times: ['prefix', 'version', 'trip_id', 'arrival_time', 'departure_time', 'arrival_time_24', 'departure_time_24', 'stop_id', 'stop_sequence', 'stop_headsign', 'pickup_type', 'drop_off_type', 'shape_dist_traveled', 'timepoint'],
  calendar: ['prefix','version','service_id','monday','tuesday','wednesday','thursday','friday','saturday','sunday','start_date','end_date'],
  calendar_dates: ['prefix','version','service_id','date','exception_type'],
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
    if (name === 'agency') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('agency_id', sql.VarChar(50), {nullable: false})
      table.columns.add('agency_name', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_url', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_timezone', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_lang', sql.VarChar(50), {nullable: true})
      table.columns.add('agency_phone', sql.VarChar(50), {nullable: true})
      table.columns.add('agency_fare_url', sql.VarChar(100), {nullable: true})
      table.columns.add('agency_email', sql.VarChar(50), {nullable: true})
    } else if (name === 'stops') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('stop_id', sql.VarChar(100), {nullable: false})
      table.columns.add('stop_code', sql.VarChar(50), {nullable: true})
      table.columns.add('stop_name', sql.VarChar(100), {nullable: false})
      table.columns.add('stop_desc', sql.VarChar(150), {nullable: true})
      table.columns.add('stop_lat', sql.Decimal(10,6), {nullable: false})
      table.columns.add('stop_lon', sql.Decimal(10,6), {nullable: false})
      table.columns.add('zone_id', sql.VarChar(50), {nullable: true})
      table.columns.add('stop_url', sql.VarChar(100), {nullable: true})
      table.columns.add('location_type', sql.Int, {nullable: true})
      table.columns.add('parent_station', sql.VarChar(100), {nullable: true})
      table.columns.add('stop_timezone', sql.VarChar(100), {nullable: true})
      table.columns.add('wheelchair_boarding', sql.Int, {nullable: true})
    } else if (name === 'routes') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('route_id', sql.VarChar(100), {nullable: false})
      table.columns.add('agency_id', sql.VarChar(100), {nullable: true})
      table.columns.add('route_short_name', sql.VarChar(50), {nullable: false})
      table.columns.add('route_long_name', sql.VarChar(150), {nullable: false})
      table.columns.add('route_desc', sql.VarChar(150), {nullable: true})
      table.columns.add('route_type', sql.Int, {nullable: false})
      table.columns.add('route_url', sql.VarChar(100), {nullable: true})
      table.columns.add('route_color', sql.VarChar(50), {nullable: true})
      table.columns.add('route_text_color', sql.VarChar(50), {nullable: true})
    } else if (name === 'trips') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('route_id', sql.VarChar(100), {nullable: false})
      table.columns.add('service_id', sql.VarChar(100), {nullable: false})
      table.columns.add('trip_id', sql.VarChar(100), {nullable: false})
      table.columns.add('trip_headsign', sql.VarChar(100), {nullable: true})
      table.columns.add('trip_short_name', sql.VarChar(50), {nullable: true})
      table.columns.add('direction_id', sql.Int, {nullable: true})
      table.columns.add('block_id', sql.VarChar(100), {nullable: true})
      table.columns.add('shape_id', sql.VarChar(100), {nullable: true})
      table.columns.add('wheelchair_accessible', sql.Int, {nullable: true})
      table.columns.add('bikes_allowed', sql.Int, {nullable: true})
    } else if (name === 'stop_times') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('trip_id', sql.VarChar(100), {nullable: false})
      table.columns.add('arrival_time', sql.Time(0), {nullable: false})
      table.columns.add('departure_time', sql.Time(0), {nullable: false})
      table.columns.add('arrival_time_24', sql.Bit, {nullable: false})
      table.columns.add('departure_time_24', sql.Bit, {nullable: false})
      table.columns.add('stop_id', sql.VarChar(50), {nullable: false})
      table.columns.add('stop_sequence', sql.Int, {nullable: false})
      table.columns.add('stop_headsign', sql.VarChar(50), {nullable: true})
      table.columns.add('pickup_type', sql.Int, {nullable: true})
      table.columns.add('drop_off_type', sql.Int, {nullable: true})
      table.columns.add('shape_dist_traveled', sql.VarChar(50), {nullable: true})
      table.columns.add('timepoint', sql.Int, {nullable: true})
    } else if (name === 'calendar') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('service_id', sql.VarChar(100), {nullable: false})
      table.columns.add('monday', sql.Bit, {nullable: false})
      table.columns.add('tuesday', sql.Bit, {nullable: false})
      table.columns.add('wednesday', sql.Bit, {nullable: false})
      table.columns.add('thursday', sql.Bit, {nullable: false})
      table.columns.add('friday', sql.Bit, {nullable: false})
      table.columns.add('saturday', sql.Bit, {nullable: false})
      table.columns.add('sunday', sql.Bit, {nullable: false})
      table.columns.add('start_date', sql.Date, {nullable: false})
      table.columns.add('end_date', sql.Date, {nullable: false})
    } else if (name === 'calendar_dates') {
      table.columns.add('prefix', sql.VarChar(50), {nullable: false})
      table.columns.add('version', sql.VarChar(50), {nullable: false})
      table.columns.add('service_id', sql.VarChar(100), {nullable: false})
      table.columns.add('date', sql.Date, {nullable: false})
      table.columns.add('exception_type', sql.Int, {nullable: false})
    } else {
      return null
    }
    return table
  }

  _mapRowToRecord(row, rowSchema, tableSchema) {
    let arrival_time_24 = false
    let departure_time_24 = false
    return tableSchema.map(column => {
      if (column === 'date' || column === 'start_date' || column === 'end_date') {
        const stringDate = row[rowSchema[column]]
        const date = new Date(0)
        date.setFullYear(stringDate.slice(0,4))
        date.setMonth(stringDate.slice(4,6))
        date.setDate(stringDate.slice(6,8))
        return date
      // i hate this library
      } else if (column === 'monday' || column === 'tuesday' || column === 'wednesday' || column === 'thursday' || column === 'friday' || column === 'saturday' || column === 'sunday') {
        return row[rowSchema[column]] === '1'
      } else if (column === 'arrival_time' || column === 'departure_time') {
        const splitRow = row[rowSchema[column]].split(':')
        // modulo and set the bit
        if (parseInt(splitRow[0]) >= 24) {
          splitRow[0] = splitRow[0] % 24
          if (column === 'arrival_time') {
            arrival_time_24 = true
          } else if (column === 'departure_time') {
            departure_time_24 = true
          }
        }
        const result = new Date(0)
        result.setUTCHours(splitRow[0])
        result.setUTCMinutes(splitRow[1])
        result.setUTCSeconds(splitRow[2])
        return result
      } else if (column === 'arrival_time_24') {
        return arrival_time_24
      } else if (column === 'departure_time_24') {
        return departure_time_24
      }
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
            console.log(err)
          })
        }
      }, {parallel: 1})
      transformer.on('finish', () => {
        let transactionsStr = totalTransactions
        if (transactionsStr > 1000) {
          transactionsStr = Math.round(transactionsStr/1000) + 'k'
        }
        console.log(logstr, transactionsStr, 'Transactions')
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