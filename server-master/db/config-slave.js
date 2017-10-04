module.exports = {
  user: 'node',
  password: 'node',
  server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
  database: 'CHANGE',
  transactionLimit: 10000, // 5000 is good for azure, 100,000 seems to be fine for Local SQL Express
  connectionTimeout: 60000,
  requestTimeout: 60000
}