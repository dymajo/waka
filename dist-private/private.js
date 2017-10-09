class DomController {
  writeWorkers(str) {
    document.getElementById('workers').innerHTML = str
    Array.from(document.querySelectorAll('#workers button')).forEach(btn => {
      btn.addEventListener('click', this.workerButton)
    })
  }
  workerButton(e) {
    const action = e.currentTarget.dataset.action
    const worker = JSON.stringify(e.currentTarget.parentElement.parentElement.dataset)
    if (action !== 'options') {
      e.currentTarget.innerHTML = '...'
      e.currentTarget.disabled = true
      controller.runWorkerAction(action, worker)
    }
  }
}

class WorkerController {
  constructor() {
    this.endpoint = 'http://localhost:8001'
    this.domController = new DomController()
  }
  start() {
    this.loadWorkers()
  }
  runWorkerAction(action, data) {
    fetch(this.endpoint + '/worker/' + action, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data
    }).then(() => {
      this.loadWorkers()
    })
  }
  loadWorkers() {
    let domString = `
      <table class="table">
        <thead>
          <th>id</th>
          <th>prefix</th>
          <th>version</th>
          <th>status</th>
          <th>startpolicy</th>
          <th>dbconfig</th>
          <th>running</th>
          <th>control</th>
        </thead>
    `
    fetch(this.endpoint + '/worker').then(res => {
      res.json().then(data => {
        data.forEach((item) => {
          let ctrl = '<span class="badge badge-pill badge-danger">stopped</span>'
          let btns
          if (item.port) {
            ctrl = '<span class="badge badge-pill badge-success">active:' + item.port + '</span>'
            btns = `
              <button type="button" data-action="stop" class="btn btn-danger btn-sm">stop</button>
              <button type="button" data-action="options" class="btn btn-light btn-sm">options</button>
            `
          } else {
            btns = `
              <button type="button" data-action="start" class="btn btn-success btn-sm">start</button>
              <button type="button" data-action="options" class="btn btn-light btn-sm">options</button>
            `
          }
          domString += `
            <tr data-prefix="${item.prefix}" data-version="${item.version}">
              <td>${item.id}</td>
              <td>${item.prefix}</td>
              <td>${item.version}</td>
              <td>${item.status}</td>
              <td>${item.startpolicy}</td>
              <td title="${item.dbname}">${item.dbconfig}</td>
              <td>${ctrl}</td>
              <td>${btns}</td>
            </tr>
          `
        })
        domString += '</table>'
        this.domController.writeWorkers(domString)
      })
    })
  }
}
const controller = new WorkerController()
window.addEventListener('DOMContentLoaded', () => controller.start())