import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet, findNodeHandle } from 'react-native'
import { withRouter, Switch, Route } from 'react-router-dom'
import { TransitionGroup, Transition } from 'react-transition-group'

import Events from '../../stores/events.js'
import { Lines } from '../lines/index.jsx'
import { UiStore } from '../../stores/uiStore.js'
import { Sponsor } from '../pages/sponsor.jsx'

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
        action = 'forward'
      } else if (action === 'POP') {
        action = 'backward'
      }
      this.setState({ animationState: state, animationAction: action })
    }
  }
  render() {
    // have to use a div for now
    const className = `shell-content ${this.state.animationState} direction-${
      this.state.animationAction
    } position-${UiStore.state.cardPosition}`
    return (
      <View className={className} ref={this.container} style={styles.wrapper}>
        {this.props.children}
      </View>
    )
  }
}

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
            timeout={300}
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
                path="/l/:region"
                exact
                render={() => (
                  <Wrapper>
                    <Lines />
                  </Wrapper>
                )}
              />
              <Route
                path="/sponsor"
                exact
                render={() => (
                  <Wrapper>
                    <Sponsor />
                  </Wrapper>
                )}
              />
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
    flex: 1,
  },
})
const ContentView = withRouter(Content)
export { ContentView }
