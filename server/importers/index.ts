import { join } from 'path'
import { VarChar } from 'mssql'
import log from '../logger'
import GtfsImport from '../db/gtfs-import'
import connection from '../db/connection'
import Storage from '../db/storage'
import KeyvalueDynamo from '../db/keyvalue-dynamo'
import config from '../config'

import AucklandImporter from './regions/nz-akl'
import ChchImporter from './regions/nz-chc'
import OtagoImporter from './regions/nz-otg'
import CanberraImporter from './regions/au-cbr'
import SyndeyImporter from './regions/au-syd'
import WellingtonImporter from './regions/nz-wlg'
import MelbourneImporter from './regions/au-mel'
import ParisImporter from './regions/fr-par'
import SEQImporter from './regions/au-seq'
import SFRImporter from './regions/ch-sfr'
import NYCImporter from './regions/us-nyc'
import BaseImporter from './BaseImporter'
import MultiImporter from './MultiImporter'
import SingleImporter from './SingleImporter'
import LocalImporter from './LocalImporter'
import PerthImporter from './regions/au-per';
import ChicagoImporter from './regions/us-chi';
import BostonImporter from './regions/us-bos'

const regions = {
  'au-mel': MelbourneImporter,
  'au-per': PerthImporter,
  'au-seq': SEQImporter,
  'au-syd': SyndeyImporter,
  'ch-sfr': SFRImporter,
  'fr-par': ParisImporter,
  'nz-akl': AucklandImporter,
  'nz-chc': ChchImporter,
  'nz-otg': OtagoImporter,
  'nz-wlg': WellingtonImporter,
  'au-cbr': CanberraImporter,
  'us-bos': BostonImporter,
  'us-chi': ChicagoImporter,
  'us-nyc': NYCImporter,
}

interface ImporterProps {
  keyvalue?: 'dynamo'
  keyvalueVersionTable?: string
  keyvalueRegion?: string
}

export function isKeyof<T extends object>(
  obj: T,
  possibleKey: keyof any,
): possibleKey is keyof T {
  return possibleKey in obj;
}


class Importer {
  importer: GtfsImport
  storage: Storage
  versions?: KeyvalueDynamo
  current: BaseImporter
  constructor(props: ImporterProps) {
    const { keyvalue, keyvalueVersionTable, keyvalueRegion } = props
    this.importer = new GtfsImport()
    this.storage = new Storage({})
    this.versions = null
    if (keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({
        name: keyvalueVersionTable,
        region: keyvalueRegion,
      })
    }

    this.current = null
    if (config.localImport) {
      this.current = new LocalImporter({
        zipname: config.localFile,
      })
    } else {
      try {
        console.log(config.prefix)
        if (isKeyof(regions, config.prefix)) {

          const Region = regions[config.prefix]
          this.current = new Region()
        }
      } catch (err) {
        log(
          'fatal error',
          'Could not find an importer in ',
          join(__dirname, './regions', `${config.prefix}.ts`),
        )
      }
    }
  }

  async start(created = false) {
    if (!this.current) {
      return
    }

    const { versions } = this
    const versionId = config.db.database
    if (versions) {
      const version = await versions.get(versionId)
      let newStatus
      if (version.status === 'pendingimport') {
        newStatus = 'importing'
      } else if (version.status === 'pendingimport-willmap') {
        newStatus = 'importing-willmap'
      } else {
        log(versionId, 'Status is not pending! Cancelling import!')
        return
      }
      version.status = newStatus
      await versions.set(versionId, version)
      log(versionId, 'Updated status to', newStatus)
    }

    // if the db is already there, avoid the first few steps
    if (!created) {
      await this.download()
      await this.unzip()
      await this.db()
    } else {
      log('DB already created - skipping download & unzip.')
    }
    await this.fixStopCodes()
    await this.fixRoutes()
    await this.addGeoLocation()
    await this.postImport()
    await this.fixDropOffType()
    await this.fixPickupType()

    await this.shapes()
    // await this.exportDb()

    if (versions) {
      const version = await versions.get(versionId)
      let newStatus
      if (version.status === 'importing') {
        newStatus = 'imported'
      } else if (version.status === 'importing-willmap') {
        newStatus = 'imported-willmap'
      } else {
        return
      }
      version.status = newStatus
      await versions.set(versionId, version)
      log(versionId, 'Updated status to', newStatus)
    }
  }

  async unzip() {
    await this.current.unzip()
  }

  async download() {
    await this.current.download()
  }

  async db() {
    await this.current.db(this.importer)
  }

  async shapes() {
    await this.current.shapes()
  }

  async fullShapes() {
    await this.current.download()
    await this.current.unzip()
    await this.current.shapes()
    await this.fixStopCodes()
    await this.fixRoutes()
    await this.addGeoLocation()
    await this.postImport()
  }

  async fixStopCodes() {
    // GTFS says it's optional, but Waka uses stop_code for stop lookups
    const sqlRequest = connection.get().request()
    const res = await sqlRequest.query(`
      UPDATE stops
      SET stop_code = stop_id
      WHERE stop_code is null;
    `)
    const rows = res.rowsAffected[0]
    log(`${config.prefix} ${config.version}`, `Updated ${rows} null stop codes`)
  }

  async fixRoutes() {
    const sqlRequest = connection.get().request()
    const res = await sqlRequest.query(`
      UPDATE routes
      SET route_long_name = route_short_name
      WHERE route_long_name is null;
    `)
    const rows = res.rowsAffected[0]
    log(
      `${config.prefix} ${config.version}`,
      `Updated ${rows} null route codes`,
    )
  }

  async fixPickupType() {
    const sqlRequest = connection.get().request()
    const res = await sqlRequest.query(`
      UPDATE stop_times
      SET pickup_type = 0
      WHERE pickup_type is null;
    `)
    const rows = res.rowsAffected[0]
    log(
      `${config.prefix} ${config.version}`,
      `Updated ${rows} null pick ups`,
    )
  }

  async fixDropOffType() {
    const sqlRequest = connection.get().request()
    const res = await sqlRequest.query(`
      UPDATE stop_times
      SET drop_off_type = 0
      WHERE drop_off_type is null;
    `)
    const rows = res.rowsAffected[0]
    log(
      `${config.prefix} ${config.version}`,
      `Updated ${rows} null drop offs`,
    )
  }

  async addGeoLocation() {
    const sqlRequest = connection.get().request()
    const res = await sqlRequest.query(`
      UPDATE stops
      SET geo_location = GEOGRAPHY ::STPointFromText('POINT(' + CAST([stop_lon] AS varchar(20)) + ' ' + CAST([stop_lat] AS varchar(20)) + ')', 4326);
    `)
    const rows = res.rowsAffected[0]
    log(`${config.prefix} ${config.version}`, `Updated ${rows} geo locations`)
  }

  async postImport() {
    if (this.current.postImport) {
      await this.current.postImport()
    }
  }

  async exportDb() {
    const sqlRequest = connection.get().request()
    const {
      db: { database },
    } = config
    sqlRequest.input('dbName', VarChar, database)
    try {
      await sqlRequest.query(
        `
        USE master;
        ALTER DATABASE ${database} SET RECOVERY SIMPLE;
        BACKUP DATABASE ${database} TO  DISK =
        N'/var/opt/mssql/backup/backup.bak'
        WITH NOFORMAT, NOINIT, NAME = ${database},
        SKIP, NOREWIND, NOUNLOAD, STATS = 10
        `,
      )
    } catch (err) {
      log(err)
    }
  }
}
export default Importer
