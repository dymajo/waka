const sql = require('mssql')
const config = require('../../config')
 
let pool1
const ready = new Promise((resolve, reject) => {
	pool1 = new sql.ConnectionPool(config, err => {
		if (err) reject()
    resolve()
	})
})
const connection = {
	get: () => {
		return pool1
	},
	isReady: ready
}
module.exports = connection