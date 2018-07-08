import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from 'react-router-dom'

import { UiStore } from './stores/uiStore.js'

import Index from './views/shell/index.jsx'

import smoothscroll from 'smoothscroll-polyfill'
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
document.addEventListener('DOMContentLoaded', function(event) {
  if (process.env.NODE_ENV === 'production') {
    document.getElementById('app').className = 'production'
    const Runtime = require('offline-plugin/runtime')
    Runtime.install()
  } else {
    console.info('Service Worker is disabled in development.')
  }
  startApp()
})
let startApp = function() {
  window.defaultContent = [
    window.location.pathname,
    (document.querySelector('.default-container') || {}).innerHTML || null,
  ]
  ReactDOM.render(<App />, document.getElementById('app'))
}
