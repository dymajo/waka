class DomController {
  writeWorkers(str) {
    document.getElementById('workers').innerHTML = str
    Array.from(document.querySelectorAll('#workers button')).forEach(btn => {
      btn.addEventListener('click', this.workerButton)
    })
    Array.from(document.querySelectorAll('#workers .dropdown-item')).forEach(a => {
      a.addEventListener('click', this.dropdownButton)
    })
  }
  workerButton(e) {
    const action = e.currentTarget.dataset.action
    const worker = JSON.stringify(e.currentTarget.parentElement.parentElement.dataset)
    e.currentTarget.innerHTML = '...'
    e.currentTarget.disabled = true
    controller.runAction(action, worker)
  }
  dropdownButton(e) {
    e.preventDefault()
    const action = e.currentTarget.dataset.action
    const worker = e.currentTarget.parentElement.parentElement.parentElement.dataset

    confirm('are you sure you want to run:\n' + action + '\n\n prefix:' + worker.prefix + '\n version:' + worker.version)
    controller.runAction(action, JSON.stringify(worker))
  }
}

class WorkerController {
  constructor() {
    this.endpoint = ''
    this.domController = new DomController()
  }
  start() {
    this.loadWorkers()
  }
  runAction(action, data) {
    fetch(this.endpoint + action, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data
    }).then(() => {
      this.loadWorkers()
    })
  }
  async loadWorkers() {
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
    let res = await fetch(this.endpoint + '/mapping')
    let mappings = await res.json()
    res = await fetch(this.endpoint + '/worker')
    let data = await res.json()

    data.forEach((item) => {
      let dropdown = `
        <a class="btn btn-sm btn-light dropdown-toggle" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          actions
        </a>

        <div class="dropdown-menu">
          <a class="dropdown-item" data-action="/mapping/set" href="#">Set Mapping</a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" data-action="/import-start/all" href="#">Run Import All</a>
          <a class="dropdown-item" data-action="/import-start/db" href="#">Run Import DB</a>
          <a class="dropdown-item" data-action="/import-start/shapes" href="#">Run Import Shapes</a>
          <a class="dropdown-item" data-action="/import-complete" href="#">Trigger Import Completion</a>
          <a class="dropdown-item" data-action="/worker/delete" href="#">Delete Worker</a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" data-action="/import-start/download" href="#">Run Download</a>
          <a class="dropdown-item" data-action="/import-start/unzip" href="#">Run Unzip</a>
        </div>
        `
      let ctrl = '<span class="badge badge-pill badge-warning">stopped</span>'
      if (item.prefix+'|'+item.version === mappings[item.prefix]) {
        ctrl = '<span class="badge badge-pill badge-danger">active:stopped</span>'
      }
      let btns
      if (item.port) {
        if (item.prefix+'|'+item.version === mappings[item.prefix]) {
          ctrl = '<span class="badge badge-pill badge-success">active:' + item.port + '</span>'
        } else {
          ctrl = '<span class="badge badge-pill badge-primary">running:' + item.port + '</span>'
        }
        btns = `
          <button type="button" data-action="/worker/stop" class="btn btn-danger btn-sm">stop</button>
          ${dropdown}
        `
      } else {
        btns = `
          <button type="button" data-action="/worker/start" class="btn btn-success btn-sm">start</button>
          ${dropdown}
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
  }
}
const controller = new WorkerController()
window.addEventListener('DOMContentLoaded', () => controller.start())