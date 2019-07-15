/* eslint-env browser */

class WorkerDomController {
  constructor(controller) {
    this.controller = controller

    this.workerButton = this.workerButton.bind(this)
    this.workerCreateButton = this.workerCreateButton.bind(this)
    this.dropdownButton = this.dropdownButton.bind(this)
  }

  start() {
    const { controller } = this
    document
      .getElementById('createWorkerConfirm')
      .addEventListener('click', this.workerCreateButton)
  }

  writeWorkers(str) {
    document.getElementById('workers').innerHTML = str
    Array.from(document.querySelectorAll('#workers button')).forEach(btn => {
      btn.addEventListener('click', this.workerButton)
    })
    Array.from(document.querySelectorAll('#workers .dropdown-item')).forEach(
      a => {
        a.addEventListener('click', this.dropdownButton)
      }
    )
  }

  workerButton(e) {
    const { controller } = this
    const { action } = e.currentTarget.dataset
    const worker = JSON.stringify(
      e.currentTarget.parentElement.parentElement.dataset
    )
    e.currentTarget.innerHTML = '...'
    e.currentTarget.disabled = true
    controller.runAction(action, worker)
  }

  workerCreateButton() {
    const { controller } = this
    const prefix = document.getElementById('workerPrefix')
    const version = document.getElementById('workerVersion')
    const shapesContainer = document.getElementById('workerShapesContainer')
    const shapesRegion = document.getElementById('workerShapesRegion')
    const dbconfig = document.getElementById('workerDbconfig')
    const newRealtime = document.getElementById('workerNewRealtime')

    // none are allowed to be blank
    if (
      [
        prefix.value,
        version.value,
        shapesContainer.value,
        shapesRegion.value,
        dbconfig.value,
      ].filter(v => v.length === 0).length > 0
    ) {
      return
    }

    controller.runAction(
      '/worker/add',
      JSON.stringify({
        prefix: prefix.value,
        version: version.value,
        shapesContainer: shapesContainer.value,
        shapesRegion: shapesRegion.value,
        dbconfig: dbconfig.value,
        newRealtime: newRealtime.checked,
      })
    )

    prefix.value = ''
    version.value = ''
    shapesContainer.value = ''
    shapesRegion.value = ''
    dbconfig.value = ''
    newRealtime.checked = false

    $('#createWorkerModal').modal('hide')
  }

  dropdownButton(e) {
    const { controller } = this
    e.preventDefault()
    const { action } = e.currentTarget.dataset
    const worker =
      e.currentTarget.parentElement.parentElement.parentElement.dataset

    if (
      confirm(`
Are you sure you want to run?
${action}

id: ${worker.id}
prefix: ${worker.prefix}`)
    ) {
      controller.runAction(action, JSON.stringify(worker))
    }
  }
}

class WorkerController {
  constructor() {
    this.endpoint = '.'
    this.domController = new WorkerDomController(this)
  }

  start() {
    this.domController.start()
    this.loadWorkers()
  }

  runAction(action, data) {
    return fetch(this.endpoint + action, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    })
      .then(r => r.json())
      .then(data => {
        if (data.command) {
          alert(data.command)
        }
      })
      .then(() => {
        this.loadWorkers()
      })
  }

  async loadWorkers() {
    let domString = `
      <table class="table">
        <thead>
          <th>Prefix</th>
          <th>Version</th>
          <th>DB Name</th>
          <th>Import Status</th>
          <th>Status</th>
          <th>New Realtime?</th>
          <th>Control</th>
        </thead>
    `
    let mappings = {}
    let data = []
    try {
      const error = new Error('Error')
      const mappingsRequest = await fetch(`${this.endpoint}/mapping`)
      mappings = await mappingsRequest.json()
      error.response = mappings
      if (mappingsRequest.status >= 400) throw error

      const workersRequest = await fetch(`${this.endpoint}/worker`)
      data = await workersRequest.json()
      error.response = data
      if (workersRequest.status >= 400) throw error
    } catch (err) {
      console.error(err)
      this.domController.writeWorkers(`
        <h4>Error!</h4>
        <pre>${JSON.stringify(err.response)}</pre>
      `)
      return
    }

    data.forEach(item => {
      let ctrl = '<span class="badge badge-pill badge-warning">inactive</span>'
      let btns =
        '<button type="button" data-action="/mapping/set" class="btn btn-light btn-sm">activate</button>'
      let recycle = ''
      if (item.id === (mappings[item.prefix] || {}).value) {
        ctrl = '<span class="badge badge-pill badge-success">active</span>'
        btns =
          '<button type="button" data-action="/mapping/delete" class="btn btn-danger btn-sm">unmap</button>'
        recycle = `
          <a class="dropdown-item" data-action="/worker/recycle" href="#">Recycle Service</a>
          <div class="dropdown-divider"></div>
        `
      }

      const dropdown = `
        <a class="btn btn-sm btn-light dropdown-toggle" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          actions
        </a>

        <div class="dropdown-menu">
          ${recycle}
          <a class="dropdown-item" data-action="/worker/docker" href="#">Get Docker Import Command</a>
          <a class="dropdown-item" data-action="/worker/status/pendingimport" href="#">Start Import (pending)</a>
          <a class="dropdown-item" data-action="/worker/status/pendingimport-willmap" href="#">Start Import & Map (pending)</a>
          <a class="dropdown-item" data-action="/worker/status/imported" href="#">Set Status to Imported</a>
          <a class="dropdown-item" data-action="/worker/status/imported-willmap" href="#">Set Status to Imported & Map</a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" data-action="/worker/delete" href="#">Delete Worker</a>
        </div>
        `

      domString += `
        <tr data-id="${item.id}" data-prefix="${item.prefix}">
          <td><a href="../${item.prefix}/info">${item.prefix}</a></td>
          <td>${item.version}</td>
          <td class="td-truncate" title="${item.dbname}">${item.dbname}</td>
          <td>${item.status}</td>
          <td>${ctrl}</td>
          <td>${item.newRealtime}</td>
          <td>${btns}${dropdown}</td>
        </tr>
      `
    })
    domString += '</table>'
    this.domController.writeWorkers(domString)
  }
}
const workerController = new WorkerController()
window.addEventListener('DOMContentLoaded', () => workerController.start())
