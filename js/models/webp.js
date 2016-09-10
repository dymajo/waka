var webpclass = {
  support: false
}
function testWebP() {
  var webP = new Image()
  webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  webP.onload = webP.onerror = function () {
    webpclass.support = (webP.height === 2)
  }
}
testWebP()
module.exports = webpclass