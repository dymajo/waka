const Defaults = require('./defaults.js')
const defaults = new Defaults()

const url = defaults.canonical
const Sitemap = {
  add: function(item) {
    Sitemap.items.push(item)
  },
  items: [url],
  get(req, res) {
    res.send(Sitemap.items.join('\n' + url))
  }
}
module.exports = Sitemap