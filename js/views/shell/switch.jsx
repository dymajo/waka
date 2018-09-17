import React from 'react'
import PropTypes from 'prop-types'
import { matchPath } from 'react-router'

/**
 * The public API for rendering the first <Route> that matches.
 */
export class Switch extends React.Component {
  static contextTypes = {
    router: PropTypes.shape({
      route: PropTypes.object.isRequired,
    }).isRequired,
  }

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
    const timeout = this.props.timeout
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
    } else {
      this.currentRoute = currentRoute
      return true
    }
  }

  render() {
    const { route } = this.context.router
    const { children } = this.props
    const location = this.props.location || route.location

    let match, child
    React.Children.forEach(children, element => {
      if (match == null && React.isValidElement(element)) {
        const { path: pathProp, exact, strict, sensitive, from } = element.props
        const path = pathProp || from

        child = element
        match = matchPath(
          location.pathname,
          { path, exact, strict, sensitive },
          route.match
        )
      }
    })

    // i don't like this, but it seems the only way to get props into the component
    // is to pass them into the location object
    location.animationState = 'entered'
    const key = location.key || 'key'
    const currentRoute = match
      ? React.cloneElement(child, { location, computedMatch: match, key: key })
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
  }
}
