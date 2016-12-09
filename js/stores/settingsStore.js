export class settingsStore {
  constructor() {
    this.state = {
      clock: true,
      longName: false
    }
    if (localStorage.getItem('SettingsData')) {
      var preState = JSON.parse(localStorage.getItem('SettingsData'))
      // copies saved state, preserves defaults
      for (var attrname in preState) {
        this.state[attrname] = preState[attrname]
      }
    }
    localStorage.setItem('AppVersion', '0.2.3')
  }
  getState() {
    return this.state
  }
  saveState() {
    localStorage.setItem('SettingsData', JSON.stringify(this.state))
  }
  toggle(item) {
    this.state[item] = !this.state[item]
    saveState()
  }
}
export let SettingsStore = new settingsStore()