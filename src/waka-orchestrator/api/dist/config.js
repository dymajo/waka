class ConfigDomController {
  constructor(controller) {
    this.controller = controller
    this.saveConfig = this.saveConfig.bind(this)
  }
  start() {
    const { controller } = this
    document
      .getElementById('saveConfig')
      .addEventListener('click', this.saveConfig)

    document
      .getElementById('restartOrchestrator')
      .addEventListener('click', () => {
        if (
          confirm(
            'Are you sure you want to restart the orchestrator?\nDepending on your environment, it may not restart automatically.'
          )
        ) {
          controller.runAction('/orchestrator/kill')
        }
      })
  }

  saveConfig(e) {
    const { controller } = this
    e.preventDefault()
    try {
      const config = JSON.parse(document.getElementById('configTextarea').value)
      controller
        .runAction('/config', JSON.stringify({ config }))
        .then(() => alert('Saved Config! Please restart Waka.'))
    } catch (err) {
      console.error(err)
      alert('Error in JSON')
    }
  }

  addGitHash(text) {
    document.getElementById('footer').innerHTML = text
  }
}

class ConfigController {
  constructor() {
    this.endpoint = '.'
    this.domController = new ConfigDomController(this)
  }

  start() {
    this.domController.start()
    this.loadConfig()
    this.getHash()
  }

  async getHash() {
    const githash = await fetch(`${this.endpoint}/git`)
    const text = await githash.text()
    this.domController.addGitHash(text)
  }

  async loadConfig() {
    const response = await fetch(`${this.endpoint}/config`)
    const data = await response.json()
    document.getElementById('configTextarea').value = JSON.stringify(
      data.config,
      ' ',
      2
    )
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
        this.loadConfig()
      })
  }
}
const configController = new ConfigController()
window.addEventListener('DOMContentLoaded', () => configController.start())
