class SettingsStore {
  constructor() {
    this.state = {
      clock: true,
      longName: false,
      lastLocation: [-36.844229, 174.767823], // britomart
      bikeShare: false,
    }
    if (localStorage.getItem('SettingsData')) {
      const preState = JSON.parse(localStorage.getItem('SettingsData'))
      // copies saved state, preserves defaults
      for (const attrname in preState) {
        this.state[attrname] = preState[attrname]
      }
    }
    localStorage.setItem('AppVersion', '2.4.5')
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
export default new SettingsStore()
