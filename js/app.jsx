import React from 'react'
import ReactDOM from 'react-dom'
import { Router, IndexRoute, Route, Link, browserHistory } from 'react-router'
import { iOS } from './models/ios.js'
import { UiStore } from './stores/uiStore.js'

import Index from './views/index.jsx'
import Splash from './views/splash.jsx'
import Search from './views/search.jsx'
import Station from './views/station.jsx'
import SavedStations from './views/savedstations.jsx'
import Settings from './views/settings.jsx'
import NoMatch from './views/nomatch.jsx'
import ListStations from './views/liststations.jsx'
import Lines from './views/lines.jsx'
import Line from './views/line.jsx'
import VehicleLocation from './views/vehicle_loc.jsx'

import autotrack from 'autotrack' // google analytics
import injectTapEventPlugin from 'react-tap-event-plugin'
injectTapEventPlugin()

class App extends React.Component {

  render() {
    return (
      <Router history={browserHistory}>
        <Route path="/" component={Index}>
          <IndexRoute component={Splash} />
          <Route path="pin" component={Splash} />
          <Route onChange={UiStore.handleReactChange} path="s" component={Search}>
            <Route path=":station" component={Station} >
              <Route path=":trip_id" component={VehicleLocation}/>
            </Route>
          </Route>
          <Route onChange={UiStore.handleReactChange} path="cf">
            <IndexRoute component={ListStations} />
            <Route path=":line" component={ListStations}>
              <Route path=":station" component={Station} />
            </Route>
          </Route>
          <Route path="l" component={Lines}>
            <Route path=":line" component={Line} />
          </Route>
          <Route onChange={UiStore.handleReactChange} path="ss" component={SavedStations}>
            <Route path=":station" component={Station} />
          </Route>
          <Route path="settings" component={Settings}/>
          <Route path="*" component={NoMatch}/>
        </Route>
      </Router>
    )
  }
}
document.addEventListener("DOMContentLoaded", function(event) {
  if (process.env.NODE_ENV === "production") {
    document.getElementById('app').className = 'production'
  }
  ReactDOM.render(<App />, document.getElementById('app'))
})
document.ontouchmove = iOS.touchMoveFix