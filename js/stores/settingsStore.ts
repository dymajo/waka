export namespace SettingsStore {
  let state = {
    clock: true,
    longName: false
  }
  if (localStorage.getItem('SettingsData')) {
    var preState = JSON.parse(localStorage.getItem('SettingsData'))
    // copies saved state, preserves defaults
    for (var attrname in preState) {
      state[attrname] = preState[attrname]
    }
  }
  localStorage.setItem('AppVersion', '0.2.1')
  export function getState() {
    return state
  }
  export function saveState() {
    localStorage.setItem('SettingsData', JSON.stringify(state))
  }
  export function toggle(item) {
    state[item] = !state[item]
    saveState()
  }
}