import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { iOS } from './models/ios.js'

import Index from './views/index.jsx'

import injectTapEventPlugin from 'react-tap-event-plugin'
injectTapEventPlugin()

import smoothscroll from 'smoothscroll-polyfill'
smoothscroll.polyfill()

class App extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <Index />
      </BrowserRouter>
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
    (document.querySelector('.default-container') || {}).innerHTML || null
  ]
  ReactDOM.render(<App />, document.getElementById('app'))
}
