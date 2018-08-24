const connection = require('./db/connection.js');
const CreateDb = require('./db/create.js');
const log = require('./logger.js');
const cache = require('./cache');
const importers = require('./importers/index');
const sql = require('mssql');
const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
  throw result.error;
}

console.log(result.parsed);

log('Worker Started');

const {
  ID,
  PREFIX,
  VERSION,
  STATUS,
  START_POLICY,
  DB_CONFIG,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SERVER,
  DB_DATABASE,
  DB_TRANSACTION_LIMIT,
  DB_CONNECTION_TIMEOUT,
  DB_REQUEST_TIMEOUT,
  MODE
} = process.env;

global.config = {
  id: ID,
  prefix: PREFIX,
  version: VERSION,
  status: STATUS,
  startpolicy: START_POLICY,
  dbconfig: DB_CONFIG,
  dbname: DB_NAME,
  mode: MODE || 'export',
  db: {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_DATABASE,
    transactionLimit: parseInt(DB_TRANSACTION_LIMIT, 10),
    connectionTimeout: parseInt(DB_CONNECTION_TIMEOUT, 10),
    requestTimeout: parseInt(DB_REQUEST_TIMEOUT, 10)
  }
};

log(
  'prefix: '.magenta,
  global.config.prefix,
  '\n       version:'.magenta,
  global.config.version,
  'config'
);
connection.isReady
  .then(() => {
    log('Connected to Database');
    const dbName = global.config.db.database;

    const sqlRequest = connection.get().request();
    sqlRequest.input('name', sql.VarChar, dbName);

    sqlRequest.query(
      `
        IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = @name)
        EXEC('CREATE DATABASE '+ @name)
      `
    );

    sqlRequest
      .query(
        `
        select OBJECT_ID('agency', 'U') as 'dbcreated'
      `
      )
      .then(data => {
        if (data.recordset[0].dbcreated === null) {
          log('Building Database from Template');
          const creator = new CreateDb();
          creator
            .start()
            .then(() => {
              log('Worker Ready');
              startImport();
            })
            .catch(err => {
              console.log(err);
            });
        } else {
          log('Worker Ready');
          cache.runReady();

          startImport();
        }
      });
  })
  .catch(err => console.log(err));

const startImport = () => {
  const importer = new importers();
  const { mode } = global.config;
  const cb = mode => {
    log(`Completed ${mode.toUpperCase()}`);
  };

  if (mode === 'all') {
    log('Started import of ALL');
    importer.start().then(() => cb(mode));
  } else if (mode === 'db') {
    log('Started import of DB');
    importer.db().then(() => cb(mode));
  } else if (mode === 'shapes') {
    log('Started import of SHAPES');
    importer.shapes().then(() => cb(mode));
  } else if (mode === 'unzip') {
    log('Started UNZIP');
    importer.unzip().then(() => cb(mode));
  } else if (mode === 'download') {
    log('Started DOWNLOAD');
    importer.download().then(() => cb(mode));
  } else if (mode === 'export') {
    log('Started EXPORT');
    importer.exportDb().then(() => cb(mode));
  }
};
