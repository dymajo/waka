import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet, findNodeHandle } from 'react-native'
import { withRouter, Switch, Route } from 'react-router-dom'
import { TransitionGroup, Transition } from 'react-transition-group'

import Events from '../../stores/events.js'
import { Station } from '../station/index.jsx'
import { Lines } from '../lines/index.jsx'
import { UiStore } from '../../stores/uiStore.js'
import { Sponsor } from '../pages/sponsor.jsx'
import { Region } from '../pages/region.jsx'
import { NoMatch } from '../pages/nomatch.jsx'

const routingEvents = new Events()

class Wrapper extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  }
  container = React.createRef()
  state = {
    animationState: 'entered',
    animationAction: 'forward',
  }
  componentDidMount() {
    routingEvents.bind('animation', this.handleEvents)
  }
  componentWillUnmount() {
    routingEvents.unbind('animation', this.handleEvents)
  }
  handleEvents = (data, state, action) => {
    if (data === findNodeHandle(this.container.current)) {
      if (action === 'PUSH') {
        action = UiStore.state.suggestedPushTransition
      } else if (action === 'POP') {
        action = UiStore.state.suggestedPopTransition
      } else if (action === 'REPLACE') {
        action = 'fade-forward'
      }
      this.setState({ animationState: state, animationAction: action })
    }
  }
  render() {
    const className = `shell-content ${this.state.animationState} direction-${
      this.state.animationAction
    } ${UiStore.state.oldCardPosition}-position-${UiStore.state.cardPosition}`
    return (
      <View className={className} ref={this.container} style={styles.wrapper}>
        {this.props.children}
      </View>
    )
  }
}

// this is just a nice alias to use in the render in the switch
const wrapFn = Child => () => (
  <Wrapper>
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
    return (
      <View style={styles.rootWrapper} className="root-card-wrapper">
        <TransitionGroup className="root-transition-group">
          <Transition
            timeout={400}
            key={this.props.location.key}
            onEntering={this.triggerStateUpdate('entering')}
            onEntered={this.triggerStateUpdate('entered')}
            onExiting={this.triggerStateUpdate('exiting')}
            onExited={this.triggerStateUpdate('exited')}
          >
            <Switch
              location={this.props.location}
              key={this.props.location.key}
            >
              <Route path="/" exact render={this.props.rootComponent} />
              <Route
                path="/s/:region/:station"
                exact
                render={wrapFn(Station)}
              />
              <Route path="/l/:region" exact render={wrapFn(Lines)} />
              <Route path="/sponsor" exact render={wrapFn(Sponsor)} />
              <Route path="/region" exact render={wrapFn(Region)} />
              <Route render={wrapFn(NoMatch)} />
            </Switch>
          </Transition>
        </TransitionGroup>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  rootWrapper: {
    height: '100%',
  },
  wrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
  },
})
const ContentView = withRouter(Content)
export { ContentView }
