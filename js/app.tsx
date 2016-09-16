import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Router, IndexRoute, Route, Link, browserHistory } from 'react-router'

import { UiStore } from './stores/uiStore.ts'

import Index from './views/index.tsx'
import Splash from './views/splash.tsx'
import Search from './views/search.tsx'
import Station from './views/station.tsx'
import SavedStations from './views/savedstations.tsx'
import Settings from './views/settings.tsx'
import NoMatch from './views/nomatch.tsx'

interface IAppProps extends React.Props<App> {}

class App extends React.Component<IAppProps, {}> {

  public render() {
    return (
      <Router history={browserHistory}>
        <Route path="/" component={Index}>
          <IndexRoute component={Splash} />
          <Route onChange={UiStore.handleReactChange} path="s" component={Search}>
            <Route path=":station" component={Station} />
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
  ReactDOM.render(<App />, document.getElementById('app'))
})

// iOS scrolling fix
document.ontouchmove = function(e) {
  e.preventDefault()
}