const sql = require('mssql');
const config = require('./config-master.js');
const log = require('../logger');
const colors = require('colors');

const connectMaster = async function() {
  const masterConfig = JSON.parse(JSON.stringify(config));
  masterConfig.database = masterConfig.master_database;
  try {
    const pool = await sql.connect(masterConfig);
    // prepared statements were not working.
    // also, you set this yourself, so your own fault if you drop all your tables
    await pool
      .request()
      .query(
        `If(db_id(N'${config.database}') IS NULL) CREATE DATABASE ${
          config.database
        }`
      );
  } catch (err) {
    console.error(
      'master'.red,
      'Failed to connect to master database! Check settings in config-master.js'
        .red
    );
    console.error(err);
    log('Process Terminating...');
    process.exit(1);
  }
  return true;
};

let pool1;
const ready = new Promise((resolve, reject) => {
  connectMaster().then(() => {
    pool1 = new sql.ConnectionPool(config, err => {
      if (err) {
        console.error(err);
        return reject();
      }
      log('Database Connection Ready');
      resolve();
    });
  });
});
const connection = {
  get: () => {
    return pool1;
  },
  open: () => {
    pool1 = new sql.ConnectionPool(global.config.db, err => {
      if (err) {
        console.error(err);
        return connection.reject();
      }
      connection.resolve();
    });
    return ready;
  },
  isReady: ready
};
module.exports = connection;
