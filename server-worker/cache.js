const cache = {
  preReady: [],
  ready: [],
  runReady: function() {
    cache.preReady.forEach(fn => fn())
    cache.ready.forEach(fn => fn())
  },
}
module.exports = cache