const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const sql = require('mssql');

const config = require('../../config');
const log = require('../logger.js');
const GtfsImport = require('../db/gtfs-import.js');
const CreateShapes = require('../db/create-shapes.js');
const connection = require('../db/connection.js');

class Importer {
  constructor() {
    this.importer = new GtfsImport();
    this.current = null;
    try {
      this.current = require(`./regions/${global.config.prefix}.js`);
    } catch (err) {
      log(
        'fatal error'.red,
        'Could not find an importer in ',
        path.join(__dirname, './regions', `${global.config.prefix}.js`)
      );
    }
  }

  async start() {
    if (!this.current) {
      return;
    }

    await this.download();
    await this.unzip();
    await this.db();
    await this.shapes();
    await this.fixStopCodes();
    await this.exportDb();
    await this.postImport();
  }

  async unzip() {
    await this.importer.unzip(this.current.zipLocation);
  }

  async download() {
    await this.current.download();
  }

  async db() {
    for (const file of this.current.files) {
      await this.importer.upload(
        `${this.current.zipLocation}unarchived`,
        file,
        global.config.version,
        file.versioned
      );
    }
  }

  async shapes() {
    const creator = new CreateShapes();
    const inputDir = path.resolve(
      `${this.current.zipLocation}unarchived`,
      'shapes.txt'
    );
    const outputDir = path.resolve(
      `${this.current.zipLocation}unarchived`,
      'shapes'
    );
    const outputDir2 = path.resolve(outputDir, global.config.version);

    // make sure the old output dir exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // cleans up old import if exists
    if (fs.existsSync(outputDir2)) {
      await new Promise((resolve, reject) => {
        rimraf(outputDir2, resolve);
      });
    }
    fs.mkdirSync(outputDir2);

    // creates the new datas
    await creator.create(inputDir, outputDir, [global.config.versmassaion]);

    const containerName = `${global.config.prefix}-${global.config.version}`
      .replace('.', '-')
      .replace('_', '-');
    await creator.upload(
      config.shapesContainer,
      path.resolve(outputDir, global.config.version)
    );
  }

  async fixStopCodes() {
    // GTFS says it's optional, but Waka uses stop_code for stop lookups
    const sqlRequest = connection.get().request();
    const res = await sqlRequest.query(`
      UPDATE stops
      SET stop_code = stop_id
      WHERE stop_code is null;
    `);
    const rows = res.rowsAffected[0];
    log(
      `${global.config.prefix} ${global.config.version}`.magenta,
      `Updated ${rows} null stop codes`
    );
  }

  async postImport() {
    if (this.current.postImport) {
      await this.current.postImport();
    }
  }

  async exportDb() {
    const sqlRequest = connection.get().request();
    const {
      db: { database }
    } = global.config;
    sqlRequest.input('dbName', sql.VarChar, database);
    await sqlRequest
      .query(
        `
        USE master;
        ALTER DATABASE ${database} SET RECOVERY SIMPLE;
        BACKUP DATABASE ${database} TO  DISK =
        N'/var/opt/mssql/backup/backup.bak'
        WITH NOFORMAT, NOINIT, NAME = ${database},
        SKIP, NOREWIND, NOUNLOAD, STATS = 10
        `
      )
      .catch(err => console.log(err));
    log('Export complete');
  }
}
module.exports = Importer;
