const config = {
    user: 'node',
    password: 'node',
    server: 'localhost', // You can use 'localhost\\instance' to connect to named instance 
    database: 'Transit',
    transactionLimit: 100000 // 5000 is good for azure, 100,000 seems to be fine for Local SQL Express
}
module.exports = config