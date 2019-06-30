import React from 'react'
import PropTypes from 'prop-types'
import { matchPath, __RouterContext } from 'react-router'

/**
 * The public API for rendering the first <Route> that matches.
 */
class Switch extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    location: PropTypes.object,
    timeout: PropTypes.number,
  }

  constructor(props) {
    super(props)

    this.lastRoute = null
    this.currentRoute = null

    this.state = {
      lastComponentLocation: this.props.location.key || 'home',
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      nextProps.location.key !== this.props.location.key ||
      nextState.lastComponentLocation !== this.state.lastComponentLocation
    )
  }

  timeout = (lastRoute, currentRoute) => {
    const newLocation = this.props.location.key || 'home'
    const { timeout } = this.props
    if (timeout > 0 && this.state.lastComponentLocation !== newLocation) {
      if (lastRoute !== null) {
        lastRoute.props.location.animationState = 'exiting'
      }
      this.lastRoute = lastRoute

      if (currentRoute !== null) {
        currentRoute.props.location.animationState = 'entering'
      }
      this.currentRoute = currentRoute
      setTimeout(() => {
        this.setState({
          lastComponentLocation: newLocation,
        })
      }, timeout)
      return false
    }
    this.currentRoute = currentRoute
    return true
  }

  render() {
    return (
      <__RouterContext.Consumer>
        {context => {
          const location = this.props.location || context.location

          let element
          let match
          React.Children.forEach(this.props.children, child => {
            if (match == null && React.isValidElement(child)) {
              const path = child.props.path || child.path.from

              element = child
              match = path
                ? matchPath(location.pathname, { ...child.props, path })
                : context.match
            }
          })

          // i don't like this, but it seems the only way to get props into the component
          // is to pass them into the location object
          location.animationState = 'entered'
          const key = location.key || 'key'
          const currentRoute = match
            ? React.cloneElement(element, {
                location,
                computedMatch: match,
                key,
              })
            : null
          const ret = this.timeout(this.currentRoute, currentRoute)
          if (ret || this.currentRoute.key === this.lastRoute.key) {
            return currentRoute
          }

          return (
            <React.Fragment>
              {this.currentRoute}
              {this.lastRoute}
            </React.Fragment>
          )
        }}
      </__RouterContext.Consumer>
    )
  }
}
export default Switch
