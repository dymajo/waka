const connection = require('./db/connection.js');
const createDb = require('./db/create.js');
const log = require('./logger.js');
const cache = require('./cache');

log('Worker Started');

(() => {
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
    DB_REQUEST_TIMEOUT
  } = process.env;
  console.log(process.env.PREFIX);

  global.config = {
    id: ID,
    prefix: PREFIX,
    version: VERSION,
    status: STATUS,
    startpolicy: START_POLICY,
    dbconfig: DB_CONFIG,
    dbname: DB_NAME,
    db: {
      user: DB_USER,
      password: DB_PASSWORD,
      server: DB_SERVER,
      database: DB_DATABASE,
      transactionLimit: DB_TRANSACTION_LIMIT,
      connectionTimeout: DB_CONNECTION_TIMEOUT,
      requestTimeout: DB_REQUEST_TIMEOUT
    }
  };

  log(
    'prefix: '.magenta,
    global.config.prefix,
    '\n       version:'.magenta,
    global.config.version
  );

  // connect to db
  connection.open().then(() => {
    log('Connected to Database');

    const sqlRequest = connection.get().request();
    sqlRequest
      .query(
        `
        select OBJECT_ID('agency', 'U') as 'dbcreated'
      `
      )
      .then(data => {
        console.log(data);
        if (data.recordset[0].dbcreated === null) {
          log('Building Database from Template');
          const creator = new createDb();
          creator
            .start()
            .then(() => {
              log('Worker Ready');
              process.send({ type: 'ready' });
            })
            .catch(err => {
              console.log(err);
            });
        } else {
          log('Worker Ready');
          cache.runReady();
          process.send({ type: 'ready' });
        }
      });
  });
})();

let lastbeat = new Date();

const duration = 3 * 60 * 1000;
setInterval(() => {
  if (new Date().getTime() - lastbeat.getTime() > duration) {
    log('No Heartbeat recieved in last 3 mins, killing process');
    process.exit();
  }
}, 60 * 1000);
