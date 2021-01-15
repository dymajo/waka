class SettingsStore {
  constructor() {
    this.state = {
      isTwentyFourHour: false,
      lastLocation: [-36.844229, 174.767823], // britomart
      bikeShare: false,
    }
    if (localStorage.getItem('SettingsData')) {
      const preState = JSON.parse(localStorage.getItem('SettingsData'))
      // copies saved state, preserves defaults
      Object.keys(preState).forEach(attr => {
        this.state[attr] = preState[attr]
      })
    }
    localStorage.setItem('AppVersion', '3.0.0')
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
