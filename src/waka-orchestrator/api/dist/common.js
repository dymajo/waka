class CommonController {
  start() {
    this.addNavbar()
  }

  addNavbar() {
    fetch('nav.html')
      .then(res => res.text())
      .then(data => {
        document.getElementById('nav').innerHTML = data
      })
  }
}
const commonController = new CommonController()
window.addEventListener('DOMContentLoaded', () => commonController.start())
