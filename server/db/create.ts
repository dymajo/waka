import { readFileSync } from 'fs'
import { resolve } from 'path'
import log from '../logger'
import connection from './connection'

const tables = [
  'agency.sql',
  'stops.sql',
  'routes.sql',
  'trips.sql',
  'stop_times.sql',
  'calendar.sql',
  'calendar_dates.sql',
]

const tempTables = [
  'temp_calendar.sql',
  'temp_stop_times.sql',
  'temp_calendar_dates.sql',
  'temp_agency.sql',
  'temp_stops.sql',
  'temp_routes.sql',
  'temp_trips.sql',
]

const procs = ['GetStopTimes.sql', 'GetTimetable.sql']

const create = async (filenames: string[]) => {
  await Promise.all(
    filenames.map(filename => {
      return connection
        .get()
        .request()
        .batch(
          readFileSync(resolve(__dirname, './procs/', filename)).toString(),
        )
    }),
  )
}

class CreateDB {
  public start = async () => {
    log('Creating Tables...')
    await create(tables)
    log('Creating temp tables...')
    await create(tempTables)
    log('Creating Stored Procedures...')
    await create(procs)
    log('Database Created')
  }
}
export default CreateDB
