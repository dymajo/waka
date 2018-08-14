const connection = require('./db/connection.js');
const createDb = require('./db/create.js');
const log = require('./logger.js');
const cache = require('./cache');

log('Worker Started');

const startup = () => {
  // config for
  global.config = message.data;
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
};

let lastbeat = new Date();

const duration = 3 * 60 * 1000;
setInterval(() => {
  if (new Date().getTime() - lastbeat.getTime() > duration) {
    log('No Heartbeat recieved in last 3 mins, killing process');
    process.exit();
  }
}, 60 * 1000);
