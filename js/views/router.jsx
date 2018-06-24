import React from 'react'
import PropTypes from 'prop-types'
import { withRouter, Route } from 'react-router-dom'
import { Switch } from './shell/switch.jsx'
import VehicleLocationBootstrap from './vehicle_loc_bootstrap.jsx'

class RouterRender extends React.Component {
  static propTypes = {
    location: PropTypes.object,
  }
  render() {
    return (
      <Switch
        location={this.props.location}
        key={this.props.location.key}
        timeout={0}
      >
        <Route path="/" exact />

        <Route
          path="/s/:region/:station/realtime/:trip_id"
          component={VehicleLocationBootstrap}
        />
        <Route
          path="/l/:region/:line_id"
          component={VehicleLocationBootstrap}
        />
      </Switch>
    )
  }
}
const RouterRenderWithRouter = withRouter(RouterRender)
export default RouterRenderWithRouter
