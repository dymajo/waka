import GtfsImport from '../db/gtfs-import'

abstract class BaseImporter {
  constructor() {
    this.files = [
      {
        name: 'transfers.txt',
        table: 'transfers',
        versioned: false,
      },
      {
        name: 'agency.txt',
        table: 'agency',
        versioned: false,
      },
      {
        name: 'stops.txt',
        table: 'stops',
        versioned: false,
      },
      {
        name: 'routes.txt',
        table: 'routes',
        versioned: false,
      },
      {
        name: 'trips.txt',
        table: 'trips',
        versioned: false,
      },
      {
        name: 'stop_times.txt',
        table: 'stop_times',
        versioned: false,
      },
      {
        name: 'calendar.txt',
        table: 'calendar',
        versioned: false,
      },
      {
        name: 'calendar_dates.txt',
        table: 'calendar_dates',
        versioned: false,
      },
      {
        name: 'frequencies.txt',
        table: 'frequencies',
        versioned: false,
      },
    ]
    this.shapeFile = 'shapes.txt'
  }
  postImport?(): Promise<void>
  optimize?(): void
  abstract download(): Promise<void>
  abstract unzip(): Promise<void>
  abstract db(importer: GtfsImport): Promise<void>
  abstract shapes(): Promise<void>
  files: {
    name: string
    table:
      | 'agency'
      | 'stops'
      | 'routes'
      | 'trips'
      | 'stop_times'
      | 'calendar'
      | 'calendar_dates'
      | 'transfers'
      | 'frequencies'
    versioned: boolean
  }[]
  shapeFile: string
}

export default BaseImporter
