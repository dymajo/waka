import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native'
import { withRouter, Route } from 'react-router-dom'

import Switch from './Switch.jsx'

import Events from '../../stores/Events'
import Station from '../station/Station.jsx'
import Save from '../station/Save.jsx'
import Timetable from '../pages/Timetable.jsx'
import Lines from '../lines/Lines.jsx'
import Line from '../lines/Line.jsx'
import Sponsor from '../pages/Sponsor.jsx'
import Region from '../pages/Region.jsx'
import Settings from '../pages/Settings.jsx'
import Blank from '../pages/Blank.jsx'
import NoMatch from '../pages/NoMatch.jsx'

import Wrapper from './Wrapper.jsx'

const routingEvents = new Events()

// this is just a nice alias to use in the render in the switch
const wrapFn = Child => props => (
  <Wrapper
    animationAction={props.history.action}
    animationState={props.location.animationState}
  >
    <Child />
  </Wrapper>
)

class Content extends React.Component {
  static propTypes = {
    rootComponent: PropTypes.func,
    history: PropTypes.object,
    location: PropTypes.object,
  }

  triggerStateUpdate = state => data => {
    const action = this.props.history.action
    routingEvents.trigger('animation', data, state, action)
  }

  render() {
    // keys on the routes save around 10ish ms
    return (
      <View style={styles.rootWrapper} className="root-card-wrapper">
        <Switch location={this.props.location} key="switch" timeout={400}>
          <Route path="/" exact render={wrapFn(this.props.rootComponent)} />
          <Route path="/s/:region/:station" exact render={wrapFn(Station)} />
          <Route path="/s/:region/:station/save" exact render={wrapFn(Save)} />
          <Route
            path="/s/:region/:station/timetable/:route_name"
            exact
            render={wrapFn(Timetable)}
          />
          <Route path="/l/:region" exact render={wrapFn(Lines)} />
          <Route path="/l/:region/:line_id" exact render={wrapFn(Line)} />
          <Route path="/sponsor" exact render={wrapFn(Sponsor)} />
          <Route path="/region" exact render={wrapFn(Region)} />
          <Route path="/settings" exact render={wrapFn(Settings)} />
          <Route path="/blank" exact render={wrapFn(Blank)} />
          <Route render={wrapFn(NoMatch)} />
        </Switch>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  rootWrapper: {},
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
export default withRouter(Content)
