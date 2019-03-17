const fs = require('fs')
const path = require('path')
const log = require('../logger.js')
const connection = require('./connection.js')

async function create() {
  log('Creating Tables...')
  await connection
    .get()
    .request()
    .batch(
      fs.readFileSync(path.resolve(__dirname, './procs/agency.sql')).toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs.readFileSync(path.resolve(__dirname, './procs/stops.sql')).toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs.readFileSync(path.resolve(__dirname, './procs/routes.sql')).toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs.readFileSync(path.resolve(__dirname, './procs/trips.sql')).toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/stop_times.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/calendar.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/calendar_dates.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/temp_agency.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/temp_stops.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/temp_routes.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/temp_trips.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/temp_stop_times.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/temp_calendar.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(
          path.resolve(__dirname, './procs/temp_calendar_dates.sql')
        )
        .toString()
    )

  log('Creating Stored Procedures...')
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/GetStopTimes.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(
          path.resolve(__dirname, './procs/GetMultipleStopTimes.sql')
        )
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(path.resolve(__dirname, './procs/GetTimetable.sql'))
        .toString()
    )
  await connection
    .get()
    .request()
    .batch(
      fs
        .readFileSync(
          path.resolve(__dirname, './procs/GetMultipleTimetable.sql')
        )
        .toString()
    )

  log('Database Created')
}

class CreateDB {
  start() {
    return create()
  }
}
module.exports = CreateDB
