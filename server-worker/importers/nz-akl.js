const defaultConfig = require('./defaultConfig.js')

const auckland = defaultConfig.get('at', {
  url: 'https://atcdn.blob.core.windows.net/data/gtfs.zip',
})
auckland.files = auckland.files.map(file => {
  if (file.name !== 'agency.txt') {
    file.versioned = true
  }
  return file
})
module.exports = auckland
