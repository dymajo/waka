// this class is copied, because server-common will disappear
const colors = require('colors')

// possibly a bit hacky, could probably use an environmental variable instead
let pid = ('      ' + process.pid.toString(16)).slice(-6).green
if (process.send === undefined) {
  pid = 'master'.red
}
const log = function() {
  const args = Array.from(arguments)
  console.log(pid, ...args)
}
module.exports = log
