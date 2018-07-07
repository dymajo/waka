import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native'
import { withRouter, Route } from 'react-router-dom'
import { Switch } from './switch.jsx'

import Events from '../../stores/events.js'
import { UiStore } from '../../stores/uiStore.js'
import { Station } from '../station/index.jsx'
import { Save } from '../station/save.jsx'
import { Timetable } from '../pages/timetable.jsx'
import { Lines } from '../lines/index.jsx'
import { Line } from '../lines/line.jsx'
import { LiveLine } from '../lines/lineLive.jsx'
import { Sponsor } from '../pages/sponsor.jsx'
import { Region } from '../pages/region.jsx'
import { Settings } from '../pages/settings.jsx'
import { Blank } from '../pages/blank.jsx'
import { NoMatch } from '../pages/nomatch.jsx'

const routingEvents = new Events()

class Wrapper extends React.Component {
  static propTypes = {
    animationState: PropTypes.string,
    animationAction: PropTypes.string,
    children: PropTypes.node,
  }
  constructor(props) {
    super(props)
  }
  render() {
    const action = this.props.animationAction
    let animation = ''
    if (action === 'PUSH') {
      animation = UiStore.state.suggestedPushTransition
    } else if (action === 'POP') {
      animation = UiStore.state.suggestedPopTransition
    } else if (action === 'REPLACE') {
      animation = 'fade-forward'
    }

    const className = `shell-content ${
      this.props.animationState
    } direction-${animation} ${UiStore.state.oldCardPosition}-position-${
      UiStore.state.cardPosition
    }`
    return (
      <View className={className} style={styles.wrapper}>
        {this.props.children}
      </View>
    )
  }
}

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
  triggerStateUpdate = state => {
    return data => {
      const action = this.props.history.action
      routingEvents.trigger('animation', data, state, action)
    }
  }
  render() {
    // keys on the routes save around 10ish ms
    return (
      <View style={styles.rootWrapper} className="root-card-wrapper">
        <Switch location={this.props.location} key="switch" timeout={400}>
          <Route path="/" exact render={this.props.rootComponent} />
          <Route path="/s/:region/:station" exact render={wrapFn(Station)} />
          <Route path="/s/:region/:station/save" exact render={wrapFn(Save)} />
          <Route
            path="/s/:region/:station/realtime/:trip_id"
            component={wrapFn(LiveLine)}
          />
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
const ContentView = withRouter(Content)
export { ContentView }
