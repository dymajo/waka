const log = function() {
  const args = Array.from(arguments)
  console.log(...args)
}
module.exports = log
