export class SettingsStore {
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
    return state
  }
  saveState() {
    localStorage.setItem('SettingsData', JSON.stringify(state))
  }
  toggle(item) {
    state[item] = !state[item]
    saveState()
  }
}
export default let settingsStore = new SettingsStore()