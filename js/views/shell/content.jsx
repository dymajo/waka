import React from 'react'
import PropTypes from 'prop-types'
import { withRouter, Switch, Route } from 'react-router-dom'
import { TransitionGroup, Transition } from 'react-transition-group'

import { Lines } from '../lines/index.jsx'

class Content extends React.Component {
  static propTypes = {
    rootComponent: PropTypes.func,
  }
  render() {
    return (
      <Switch location={this.props.location} key={this.props.location.key}>
        <Route path="/" exact render={this.props.rootComponent} />
        <Route path="/l/:region" component={Lines} />
      </Switch>
    )
  }
}
const ContentView = withRouter(Content)
export { ContentView }
