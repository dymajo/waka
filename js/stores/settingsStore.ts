export namespace SettingsStore {
  let state = {
    clock: true
  }
  if (localStorage.getItem('SettingsData')) {
    state = JSON.parse(localStorage.getItem('SettingsData'))
  }
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