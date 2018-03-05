// this is set up to work great with the docker config, but you can change if you need
// make sure to apply changes to config-slave too
const config = {
  user: process.env.sql_username || 'SA',
  password: process.env.sql_password || 'Str0ngPassword',
  server: process.env.sql_database || 'localhost', // You can use 'localhost\\instance' to connect to named instance 
  // uncomment if you're running sql server in docker, but waka outside
  // port: 1401,
  master_database: 'master',
  database: 'transit_master',  
  transactionLimit: 50000, // 5000 is good for azure, 100,000 seems to be fine for Local SQL Express
  connectionTimeout: 60000,
  requestTimeout: 60000
}
module.exports = config
