module.exports = {
  user: process.env.sql_username || 'SA',
  password: process.env.sql_password || 'Str0ngPassword',
  server: process.env.sql_database || 'localhost', // You can use 'localhost\\instance' to connect to named instance 
  // uncomment if you're running sql server in docker, but waka outside
  // port: 1401,
  database: 'CHANGE',
  transactionLimit: 10000, // 5000 is good for azure, 100,000 seems to be fine for Local SQL Express
  connectionTimeout: 60000,
  requestTimeout: 60000
}
