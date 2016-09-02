import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Router, IndexRoute, Route, Link, browserHistory } from 'react-router'

import Index from './views/index.tsx'
import Splash from './views/splash.tsx'
import Search from './views/search.tsx'
import Station from './views/station.tsx'

interface IAppProps extends React.Props<App> {}

class App extends React.Component<IAppProps, {}> {

  public render() {
    return (
      <Router history={browserHistory}>
        <Route path="/" component={Index}>
          <IndexRoute component={Splash} />
          <Route path="s">
            <IndexRoute component={Search} />
            <Route path=":station" component={Station} />
          </Route>
        </Route>
      </Router>
    )
  }
}
document.addEventListener("DOMContentLoaded", function(event) {
  ReactDOM.render(<App />, document.getElementById('app'))
})