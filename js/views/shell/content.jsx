import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet, findNodeHandle } from 'react-native'
import { withRouter, Switch, Route } from 'react-router-dom'
import { TransitionGroup, Transition } from 'react-transition-group'

import Events from '../../stores/events.js'
import { Lines } from '../lines/index.jsx'
import { UiStore } from '../../stores/uiStore.js'

const routingEvents = new Events()

class Wrapper extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  }
  container = React.createRef()
  state = {
    animationState: 'entered',
  }
  componentDidMount() {
    routingEvents.bind('animation', this.handleEvents)
  }
  componentWillUnmount() {
    routingEvents.unbind('animation', this.handleEvents)
  }
  handleEvents = (data, state) => {
    if (data === findNodeHandle(this.container.current)) {
      this.setState({ animationState: state })
    }
  }
  render() {
    // have to use a div for now
    const className = `shell-content ${this.state.animationState} position-${
      UiStore.state.cardPosition
    }`
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
  }
  triggerStateUpdate(state) {
    return data => {
      routingEvents.trigger('animation', data, state)
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
                render={() => (
                  <Wrapper>
                    <Lines />
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
