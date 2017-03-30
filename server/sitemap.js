const sitemap = {
  siteUrl: 'https://transit.dymajo.com',
  defaultUrls: function() {
    const items = [
      sitemap.siteUrl,
      sitemap.siteUrl + '/l',
      sitemap.siteUrl + '/settings'
    ]
    sitemap.map += items.join('\n') + '\n'
  },
  map: '',
  push: function(link) {
    sitemap.map += sitemap.siteUrl + link + '\n'
  },
  serve: function(req, res) {
    res.set('Content-Type', 'text/plain')
    res.send(sitemap.map)
  }
}
sitemap.defaultUrls()
module.exports = sitemap