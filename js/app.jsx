import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from 'react-router-dom'
import smoothscroll from 'smoothscroll-polyfill'

import { UiStore } from './stores/uiStore.js'
import Index from './views/shell/index.jsx'

smoothscroll.polyfill()

class App extends React.Component {
  render() {
    return (
      <Router history={UiStore.customHistory}>
        <Index />
      </Router>
    )
  }
}
document.addEventListener('DOMContentLoaded', () => {
  if (process.env.NODE_ENV === 'production') {
    const twa = document.referrer.substring(0, 14) === 'android-app://' ? ' twa-standalone' : ''
    document.getElementById('app').className = `production${twa}`
    const Runtime = require('offline-plugin/runtime')
    Runtime.install()
  } else {
    console.info('Service Worker is disabled in development.')
  }
  window.defaultContent = [
    window.location.pathname,
    (document.querySelector('.default-container') || {}).innerHTML || null,
  ]
  ReactDOM.render(<App />, document.getElementById('app'))
})
