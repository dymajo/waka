const sql = require('mssql')
const extract = require('extract-zip')
const csvparse = require('csv-parse')
const transform = require('stream-transform')
const fs = require('fs')
const path = require('path')
const util = require('util')
const connection = require('./connection.js')
const log = require('../logger.js')
const config = require('../config')

const primaryKeys = {
  agency: 'agency_id',
  stops: 'stop_id',
  routes: 'route_id',
  trips: 'trip_id',
  stop_times: 'trip_id',
  calendar: 'service_id',
  calendar_dates: 'service_id',
}

const schemas = {
  agency: [
    'agency_id',
    'agency_name',
    'agency_url',
    'agency_timezone',
    'agency_lang',
    'agency_phone',
    'agency_fare_url',
    'agency_email',
  ],
  stops: [
    'stop_id',
    'stop_code',
    'stop_name',
    'stop_desc',
    'stop_lat',
    'stop_lon',
    'zone_id',
    'stop_url',
    'location_type',
    'parent_station',
    'stop_timezone',
    'wheelchair_boarding',
  ],
  routes: [
    'route_id',
    'agency_id',
    'route_short_name',
    'route_long_name',
    'route_desc',
    'route_type',
    'route_url',
    'route_color',
    'route_text_color',
  ],
  trips: [
    'route_id',
    'service_id',
    'trip_id',
    'trip_headsign',
    'trip_short_name',
    'direction_id',
    'block_id',
    'shape_id',
    'wheelchair_accessible',
    'bikes_allowed',
  ],
  stop_times: [
    'trip_id',
    'arrival_time',
    'departure_time',
    'arrival_time_24',
    'departure_time_24',
    'stop_id',
    'stop_sequence',
    'stop_headsign',
    'pickup_type',
    'drop_off_type',
    'shape_dist_traveled',
    'timepoint',
  ],
  calendar: [
    'service_id',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'start_date',
    'end_date',
  ],
  calendar_dates: ['service_id', 'date', 'exception_type'],
}

class GtfsImport {
  async unzip(location) {
    log('Unzipping GTFS Data')
    const extractor = util.promisify(extract)

    await extractor(location, { dir: path.resolve(`${location}unarchived`) })
  }

  getTable(name, hashName, hash = false) {
    let newName = name
    if (hash) {
      newName = `${hashName}`
    }
    const table = new sql.Table(newName)
    if (hash) {
      table.create = true
    }
    if (name === 'agency') {
      table.columns.add('agency_id', sql.VarChar(50), { nullable: false })
      table.columns.add('agency_name', sql.VarChar(100), { nullable: false })
      table.columns.add('agency_url', sql.VarChar(100), { nullable: false })
      table.columns.add('agency_timezone', sql.VarChar(100), {
        nullable: false,
      })
      table.columns.add('agency_lang', sql.VarChar(50), { nullable: true })
      table.columns.add('agency_phone', sql.VarChar(50), { nullable: true })
      table.columns.add('agency_fare_url', sql.VarChar(100), {
        nullable: true,
      })
      table.columns.add('agency_email', sql.VarChar(50), { nullable: true })
    } else if (name === 'stops') {
      table.columns.add('stop_id', sql.VarChar(100), { nullable: false })
      table.columns.add('stop_code', sql.VarChar(50), { nullable: true })
      table.columns.add('stop_name', sql.VarChar(100), { nullable: false })
      table.columns.add('stop_desc', sql.VarChar(150), { nullable: true })
      table.columns.add('stop_lat', sql.Decimal(10, 6), { nullable: false })
      table.columns.add('stop_lon', sql.Decimal(10, 6), { nullable: false })
      table.columns.add('zone_id', sql.VarChar(50), { nullable: true })
      table.columns.add('stop_url', sql.VarChar(100), { nullable: true })
      table.columns.add('location_type', sql.Int, { nullable: true })
      table.columns.add('parent_station', sql.VarChar(100), { nullable: true })
      table.columns.add('stop_timezone', sql.VarChar(100), { nullable: true })
      table.columns.add('wheelchair_boarding', sql.Int, { nullable: true })
    } else if (name === 'routes') {
      table.columns.add('route_id', sql.VarChar(100), { nullable: false })
      table.columns.add('agency_id', sql.VarChar(100), { nullable: true })
      table.columns.add('route_short_name', sql.VarChar(50), {
        nullable: false,
      })
      table.columns.add('route_long_name', sql.VarChar(150), {
        nullable: true,
      })
      table.columns.add('route_desc', sql.VarChar(150), { nullable: true })
      table.columns.add('route_type', sql.Int, { nullable: false })
      table.columns.add('route_url', sql.VarChar(150), { nullable: true })
      table.columns.add('route_color', sql.VarChar(50), { nullable: true })
      table.columns.add('route_text_color', sql.VarChar(50), {
        nullable: true,
      })
    } else if (name === 'trips') {
      table.columns.add('route_id', sql.VarChar(100), { nullable: false })
      table.columns.add('service_id', sql.VarChar(100), { nullable: false })
      table.columns.add('trip_id', sql.VarChar(100), { nullable: false })
      table.columns.add('trip_headsign', sql.VarChar(100), { nullable: true })
      table.columns.add('trip_short_name', sql.VarChar(50), { nullable: true })
      table.columns.add('direction_id', sql.Int, { nullable: true })
      table.columns.add('block_id', sql.VarChar(100), { nullable: true })
      table.columns.add('shape_id', sql.VarChar(100), { nullable: true })
      table.columns.add('wheelchair_accessible', sql.Int, { nullable: true })
      table.columns.add('bikes_allowed', sql.Int, { nullable: true })
    } else if (name === 'stop_times') {
      table.columns.add('trip_id', sql.VarChar(100), { nullable: false })
      table.columns.add('arrival_time', sql.Time(0), { nullable: false })
      table.columns.add('departure_time', sql.Time(0), { nullable: false })
      table.columns.add('arrival_time_24', sql.Bit, { nullable: false })
      table.columns.add('departure_time_24', sql.Bit, { nullable: false })
      table.columns.add('stop_id', sql.VarChar(50), { nullable: false })
      table.columns.add('stop_sequence', sql.Int, { nullable: false })
      table.columns.add('stop_headsign', sql.VarChar(50), { nullable: true })
      table.columns.add('pickup_type', sql.Int, { nullable: true })
      table.columns.add('drop_off_type', sql.Int, { nullable: true })
      table.columns.add('shape_dist_traveled', sql.VarChar(50), {
        nullable: true,
      })
      table.columns.add('timepoint', sql.Int, { nullable: true })
    } else if (name === 'calendar') {
      table.columns.add('service_id', sql.VarChar(100), { nullable: false })
      table.columns.add('monday', sql.Bit, { nullable: false })
      table.columns.add('tuesday', sql.Bit, { nullable: false })
      table.columns.add('wednesday', sql.Bit, { nullable: false })
      table.columns.add('thursday', sql.Bit, { nullable: false })
      table.columns.add('friday', sql.Bit, { nullable: false })
      table.columns.add('saturday', sql.Bit, { nullable: false })
      table.columns.add('sunday', sql.Bit, { nullable: false })
      table.columns.add('start_date', sql.Date, { nullable: false })
      table.columns.add('end_date', sql.Date, { nullable: false })
    } else if (name === 'calendar_dates') {
      table.columns.add('service_id', sql.VarChar(100), { nullable: false })
      table.columns.add('date', sql.Date, { nullable: false })
      table.columns.add('exception_type', sql.Int, { nullable: false })
    } else {
      return null
    }
    return table
  }

  _mapRowToRecord(row, rowSchema, tableSchema) {
    let arrival_time_24 = false
    let departure_time_24 = false
    return tableSchema.map(column => {
      if (
        column === 'date' ||
        column === 'start_date' ||
        column === 'end_date'
      ) {
        const stringDate = row[rowSchema[column]]
        const date = new Date(0)
        date.setUTCFullYear(stringDate.slice(0, 4))
        date.setUTCMonth(parseInt(stringDate.slice(4, 6), 10) - 1) // dates start from 0??
        date.setUTCDate(stringDate.slice(6, 8))
        return date
        // i hate this library
      }
      if (
        column === 'monday' ||
        column === 'tuesday' ||
        column === 'wednesday' ||
        column === 'thursday' ||
        column === 'friday' ||
        column === 'saturday' ||
        column === 'sunday'
      ) {
        return row[rowSchema[column]] === '1'
      }
      if (column === 'arrival_time' || column === 'departure_time') {
        const splitRow = row[rowSchema[column]].split(':')
        // modulo and set the bit
        if (parseInt(splitRow[0], 10) >= 24) {
          splitRow[0] %= 24
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
      }
      if (column === 'arrival_time_24') {
        return arrival_time_24
      }
      if (column === 'departure_time_24') {
        return departure_time_24
      }
      if (column === 'route_short_name' && row[rowSchema[column]] === '') {
        row[rowSchema[column]] = row[rowSchema.route_long_name].split(' ')[0]
      }
      return row[rowSchema[column]] || null
    })
  }

  async mergeFirst(location, file, version, containsVersion, endpoint) {
    const hashName = `temp_${file.table}`
    let table = this.getTable(file.table, hashName, true)
    const finalTable = this.getTable(file.table)
    if (table === null) return null

    const logstr = file.table.toString().yellow
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(path.resolve(location, file.name))
      input.on('error', reject)
      const parser = csvparse({ delimiter: ',' })
      let headers = null
      let transactions = 0
      let totalTransactions = 0

      const transformer = transform(
        async (row, callback) => {
          // builds the csv headers for easy access later
          if (headers === null) {
            headers = {}
            row.forEach((item, index) => {
              headers[item] = index
            })
            return callback(null)
          }

          const processRow = async () => {
            if (row && row.length > 1) {
              const tableSchema = schemas[file.table]
              if (tableSchema) {
                const record = this._mapRowToRecord(row, headers, tableSchema)

                // check if the row is versioned, and whether to upload it
                if (
                  containsVersion &&
                  record.join(',').match(version) === null
                ) {
                  return
                }

                table.rows.add(...record)

                transactions += 1
                totalTransactions += 1
              }
            }
          }

          // assembles our CSV into JSON
          if (transactions < config.db.transactionLimit) {
            processRow()
            callback(null)
          } else {
            if (totalTransactions > 1000000) {
              log(endpoint, logstr, `${totalTransactions / 1000000}m Rows`)
            } else {
              log(endpoint, logstr, `${totalTransactions / 1000}k Rows`)
            }
            try {
              await this.commit(table)
              log(endpoint, logstr, 'Transaction Committed.')
              transactions = 0
              // await this.mergeToFinal(config.table, hashName)
              // log(endpoint, logstr, 'Merge Committed.')
              table = this.getTable(file.table)
              processRow()
              callback(null)
            } catch (err) {
              console.log(err)
            }
          }
        },
        { parallel: 1 }
      )
      transformer.on('finish', async () => {
        let transactionsStr = totalTransactions
        if (transactionsStr > 1000) {
          transactionsStr = `${Math.round(transactionsStr / 1000)}k`
        }
        log(endpoint, logstr, transactionsStr, 'Rows')
        try {
          await this.commit(table)

          log(endpoint, logstr, 'Transaction Committed.')
          await this.mergeToFinal(file.table, hashName)
          log(endpoint, logstr, 'Merge Committed.')
          resolve()
        } catch (error) {
          reject(error)
        }
      })

      input.pipe(parser).pipe(transformer)
    })
  }

  async upload(
    location,
    file,
    version,
    containsVersion,
    endpoint,
    merge = false
  ) {
    if (merge) {
      return this.mergeFirst(location, file, version, containsVersion, endpoint)
    }
    let table = this.getTable(file.table)
    if (table === null) return null
    const logstr = file.table.toString().magenta
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(path.resolve(location, file.name))
      input.on('error', reject)
      const parser = csvparse({ delimiter: ',' })
      let headers = null
      let transactions = 0
      let totalTransactions = 0

      const transformer = transform(
        async (row, callback) => {
          // builds the csv headers for easy access later
          if (headers === null) {
            headers = {}
            row.forEach((item, index) => {
              headers[item] = index
            })
            return callback(null)
          }

          const processRow = async () => {
            if (row && row.length > 1) {
              const tableSchema = schemas[file.table]
              if (tableSchema) {
                const record = this._mapRowToRecord(row, headers, tableSchema)

                // check if the row is versioned, and whether to upload it
                if (
                  containsVersion &&
                  record.join(',').match(version) === null
                ) {
                  return
                }

                table.rows.add(...record)

                transactions += 1
                totalTransactions += 1
              }
            }
          }

          // assembles our CSV into JSON
          if (transactions < config.db.transactionLimit) {
            processRow()
            callback(null)
          } else {
            log(endpoint, logstr, `${totalTransactions / 1000}k Rows`)
            try {
              await this.commit(table)
              log(endpoint, logstr, 'Transaction Committed.')
              transactions = 0

              table = this.getTable(file.table)
              processRow()
              callback(null)
            } catch (err) {
              console.log(err)
            }
          }
        },
        { parallel: 1 }
      )
      transformer.on('finish', async () => {
        let transactionsStr = totalTransactions
        if (transactionsStr > 1000) {
          transactionsStr = `${Math.round(transactionsStr / 1000)}k`
        }
        log(endpoint, logstr, transactionsStr, 'Rows')
        try {
          await this.commit(table)

          log(endpoint, logstr, 'Transaction Committed.')
          resolve()
        } catch (error) {
          reject(error)
        }
      })

      input.pipe(parser).pipe(transformer)
    })
  }

  async commit(table) {
    try {
      const result = await connection
        .get()
        .request()
        .bulk(table)
    } catch (error) {
      debugger
      console.error(error)
    }
  }

  async mergeToFinal(table) {
    const hashTable = `temp_${table}`
    const primaryKey = primaryKeys[table]
    const sqlRequest = connection.get().request()
    const columns = schemas[table].join()
    const insertColumns = schemas[table].map(col => `H.${col}`).join()

    const merge = await sqlRequest.query(
      `MERGE
        INTO ${table} as T
        USING ${hashTable} AS H
        ON T.${primaryKey} = H.${primaryKey}
        WHEN NOT MATCHED BY TARGET
          THEN INSERT (${columns})
            VALUES (${insertColumns});
      TRUNCATE TABLE ${hashTable}



   `
    )
    // DROP TABLE ${hashTable};
  }
}
module.exports = GtfsImport
