let pid = `      ${process.pid.toString(16)}`.slice(-6)
if (process.send === undefined) {
  pid = 'master'
}
const log = function() {
  const args = Array.from(arguments)
  console.log(pid, ...args)
}
module.exports = log
