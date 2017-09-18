import React from 'react'
import { Link } from 'react-router-dom'

import BackIcon from '../../dist/icons/back.svg'

import { UiStore } from '../stores/uiStore.js'
const style = UiStore.getAnimation()

class NoMatch extends React.Component {  
  state = {
    animation: 'unmounted',
    content: (window.defaultContent[1] && window.location.pathname === window.defaultContent[0]) ? window.defaultContent[1] : null
  }
  componentDidMount() {
    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    UiStore.unbind('animation', this.animation)
  }
  animation = (data) => {
    if (data[1] !== this.container || this.animationOverride === true) {
      return
    // doesn't run if we're decending from down the tree up
    } else if (data[0] === 'exiting' && window.location.pathname !== '/') {
      return
    } else {
      this.setState({
        animation: data[0]
      })
    }
  }
  render() {
    if (this.state.content) {
      return (
        <div className="default-container" dangerouslySetInnerHTML={{__html: this.state.content}} style={style[this.state.animation]}></div>
      )
    }
    return (
      <div className="default-container http-not-found" style={style[this.state.animation]}>
        <header className="material-header">
          <Link to="/" className="header-left" onTouchTap={this.triggerBack}>
            <BackIcon />
          </Link>
          <div className="header-expand">
            <h1>Not Found</h1>
          </div>
        </header>
        <div className="default-content">
          <p>Sorry, but the page you were trying to view does not exist.</p>
          <Link to="/">Find a Station</Link>
        </div>
      </div>
    )
  }
}
export default NoMatch