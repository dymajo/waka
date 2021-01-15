import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native'
import { withRouter, Route } from 'react-router-dom'

import Switch from './Switch.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

import { vars } from '../../styles.js'
import Events from '../../stores/Events'
import Station from '../station/Station.jsx'
import Save from '../station/Save.jsx'
import LineList from '../lines/LineList.jsx'
import Line from '../lines/Line.jsx'
import LinePicker from '../lines/LinePicker.jsx'
import Feedback from '../pages/Feedback.jsx'
import Guidebook from '../pages/Guidebook.jsx'
import Sponsor from '../pages/Sponsor.jsx'
import Region from '../pages/Region.jsx'
import Settings from '../pages/Settings.jsx'
import NoMatch from '../pages/NoMatch.jsx'

import Wrapper from './Wrapper.jsx'

const { desktopThreshold } = vars

const routingEvents = new Events()

let styles

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

  state = {
    desktopLayout: window.innerWidth > desktopThreshold,
  }

  triggerStateUpdate = state => data => {
    const { history } = this.props
    const { action } = history
    routingEvents.trigger('animation', data, state, action)
  }

  triggerLayout = () => {
    const { desktopLayout } = this.state
    if (window.innerWidth > desktopThreshold && desktopLayout === false) {
      this.setState({
        desktopLayout: true,
      })
    } else if (
      window.innerWidth <= desktopThreshold &&
      desktopLayout === true
    ) {
      this.setState({
        desktopLayout: false,
      })
    }
  }

  render() {
    const { location, rootComponent } = this.props
    const { desktopLayout } = this.state
    return (
      <View
        style={
          desktopLayout
            ? [styles.rootWrapper, styles.desktop]
            : styles.rootWrapper
        }
        onLayout={this.triggerLayout}
      >
        <ErrorBoundary>
          <Switch location={location} key="switch" timeout={400}>
            <Route path="/" exact render={wrapFn(rootComponent)} />
            <Route
              path="/fail"
              exact
              render={() => {
                throw new Error('Intentional error')
              }}
            />
            <Route path="/s/:region/:station" exact render={wrapFn(Station)} />
            <Route
              path="/s/:region/:station/save"
              exact
              render={wrapFn(Save)}
            />
            <Route path="/l/:region" exact render={wrapFn(LineList)} />
            <Route
              path="/l/:region/:agency_id/:route_short_name"
              exact
              render={wrapFn(Line)}
            />
            <Route
              path="/l/:region/:agency_id/:route_short_name/picker"
              exact
              render={wrapFn(LinePicker)}
            />
            <Route path="/feedback" exact render={wrapFn(Feedback)} />
            <Route path="/guide/:region" render={wrapFn(Guidebook)} />
            <Route path="/region" exact render={wrapFn(Region)} />
            <Route path="/settings" exact render={wrapFn(Settings)} />
            <Route path="/sponsor" exact render={wrapFn(Sponsor)} />
            <Route render={wrapFn(NoMatch)} />
          </Switch>
        </ErrorBoundary>
      </View>
    )
  }
}
styles = StyleSheet.create({
  rootWrapper: {
    boxShadow: 'rgba(0,0,0,0.3) 0 0 3px',
    backgroundColor: '#000',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    height: 'calc(100% - 25px)',
  },
  desktop: {
    height: '100%',
  },
})
export default withRouter(Content)
