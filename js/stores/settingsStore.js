export class settingsStore {
  constructor() {
    this.state = {
      clock: true,
      longName: false,
      lastLocation: [-36.844229, 174.767823] // britomart
    }
    if (localStorage.getItem('SettingsData')) {
      var preState = JSON.parse(localStorage.getItem('SettingsData'))
      // copies saved state, preserves defaults
      for (var attrname in preState) {
        this.state[attrname] = preState[attrname]
      }
    }
    localStorage.setItem('AppVersion', '2.2.0')
  }
  getState() {
    return this.state
  }
  saveState() {
    if (this.state.lastLocation[0] === 0) {
      this.state.lastLocation = [-36.844229, 174.767823]
    }
    localStorage.setItem('SettingsData', JSON.stringify(this.state))
  }
  toggle(item) {
    this.state[item] = !this.state[item]
    this.saveState()
  }
}
export let SettingsStore = new settingsStore()