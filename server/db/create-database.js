const fs = require('fs')
const path = require('path')
const sql = require('mssql')
const connection = require('./connection.js')

const agency = `
CREATE TABLE agency (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  agency_id nvarchar(100) NOT NULL,
  agency_name nvarchar(100) NOT NULL,
  agency_url nvarchar(100) NOT NULL,
  agency_timezone nvarchar(100) NOT NULL,
  agency_lang nvarchar(50),
  agency_phone nvarchar(50),
  agency_fare_url nvarchar(100),
  agency_email nvarchar(50),
  CONSTRAINT uc_Agency UNIQUE (prefix, version, agency_id)
)
`

const stops = `
CREATE TABLE stops (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  stop_id nvarchar(100) NOT NULL,
  stop_code nvarchar(50),
  stop_name nvarchar(100) NOT NULL,
  stop_desc nvarchar(150),
  stop_lat decimal(10,6) NOT NULL,
  stop_lon decimal(10,6) NOT NULL,
  zone_id nvarchar(50),
  stop_url nvarchar(100),
  location_type int,
  parent_station nvarchar(100),
  stop_timezone nvarchar(100),
  wheelchair_boarding int,
  CONSTRAINT uc_Stops UNIQUE (prefix, version, stop_id)
)
`
const stops_index = `
CREATE NONCLUSTERED INDEX id_Stops
ON trips (prefix, version)
INCLUDE (prefix, version, stop_code)
`

const routes = `
CREATE TABLE routes (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  route_id nvarchar(100) NOT NULL,
  agency_id nvarchar(100),
  route_short_name nvarchar(50) NOT NULL,
  route_long_name nvarchar(150) NOT NULL,
  route_desc nvarchar(150),
  route_type int NOT NULL,
  route_url nvarchar(100),
  route_color nvarchar(50),
  route_text_color nvarchar(50),
  CONSTRAINT uc_Routes UNIQUE (prefix, version, route_id)
)
`

const trips = `
CREATE TABLE trips (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  route_id nvarchar(100) NOT NULL,
  service_id nvarchar(100) NOT NULL,
  trip_id nvarchar(100) NOT NULL,
  trip_headsign nvarchar(100),
  trip_short_name nvarchar(50),
  direction_id int,
  block_id nvarchar(100),
  shape_id nvarchar(100),
  wheelchair_accessible int,
  bikes_allowed int,
  CONSTRAINT uc_Trips UNIQUE (prefix, version, trip_id)
)
`
const trips_index = `
CREATE NONCLUSTERED INDEX id_Trips
ON trips (prefix, version)
INCLUDE (route_id, service_id, trip_id, trip_headsign, direction_id, shape_id)
`

// TODO: add indicies
const stop_times = `
CREATE TABLE stop_times (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  trip_id nvarchar(100) NOT NULL,
  arrival_time time(0) NOT NULL,
  departure_time time(0) NOT NULL,
  arrival_time_24 bit NOT NULL,
  departure_time_24 bit NOT NULL,
  stop_id nvarchar(100) NOT NULL,
  stop_sequence int NOT NULL,
  stop_headsign nvarchar(100),
  pickup_type int,
  drop_off_type int,
  shape_dist_traveled float,
  timepoint int
)
`
const stop_times_index = `
CREATE NONCLUSTERED INDEX id_Stop_Times
ON stop_times (prefix, version, stop_id, departure_time)
INCLUDE (trip_id, arrival_time, arrival_time_24, stop_sequence)
`
const stop_times_index2 = `
CREATE NONCLUSTERED INDEX id_Stop_Times_Trips
ON stop_times (prefix, version, trip_id)
`

const calendar = `
CREATE TABLE calendar (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  service_id nvarchar(100) NOT NULL,
  monday bit NOT NULL,
  tuesday bit NOT NULL,
  wednesday bit NOT NULL,
  thursday bit NOT NULL,
  friday bit NOT NULL,
  saturday bit NOT NULL,
  sunday bit NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
)
`
const calendar_index = `
  CREATE NONCLUSTERED INDEX id_Calendar
  ON calendar (prefix, version, service_id)
`

const calendar_dates = `
CREATE TABLE calendar_dates (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  service_id nvarchar(100) NOT NULL,
  date date NOT NULL,
  exception_type int NOT NULL,
)
`
const calendar_dates_index = `
  CREATE NONCLUSTERED INDEX id_Calendar_Dates
  ON calendar_dates (prefix, version, service_id, date)
`

const versions = `
CREATE TABLE versions (
  uid uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL
)
`

async function start() {
  console.log('Creating Tables...')
  await connection.get().request().query(agency)
  await connection.get().request().query(stops)
  await connection.get().request().query(stops_index)
  await connection.get().request().query(routes)
  await connection.get().request().query(trips)
  await connection.get().request().query(trips_index)
  await connection.get().request().query(stop_times)
  await connection.get().request().query(stop_times_index)
  await connection.get().request().query(stop_times_index2)
  await connection.get().request().query(calendar)
  await connection.get().request().query(calendar_index)
  await connection.get().request().query(calendar_dates)
  await connection.get().request().query(calendar_dates_index)
  await connection.get().request().query(versions)

  console.log('Creating Procedures...')
  const GetStopTimes = fs.readFileSync(path.resolve(__dirname, './procs/GetStopTimes.sql')) // no promises :| 
  await connection.get().request().batch(GetStopTimes.toString())  
  const GetMultipleStopTimes = fs.readFileSync(path.resolve(__dirname, './procs/GetMultipleStopTimes.sql')) 
  await connection.get().request().batch(GetMultipleStopTimes.toString())  
  const GetTimetable = fs.readFileSync(path.resolve(__dirname, './procs/GetTimetable.sql'))
  await connection.get().request().batch(GetTimetable.toString())  
  const GetMultipleTimetable = fs.readFileSync(path.resolve(__dirname, './procs/GetMultipleTimetable.sql'))
  await connection.get().request().batch(GetMultipleTimetable.toString())  

  connection.get().close()

  console.log('Done!')
}

connection.isReady.then(start)