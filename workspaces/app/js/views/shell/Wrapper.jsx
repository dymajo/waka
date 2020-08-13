import React, { Component } from 'react'
import PropTypes from 'prop-types'
import UiStore from '../../stores/UiStore'

class Wrapper extends Component {
  static propTypes = {
    animationState: PropTypes.string,
    animationAction: PropTypes.string,
    children: PropTypes.node,
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

    return (
      <div
        className={`shell-content ${this.props.animationState} direction-${animation} ${UiStore.state.oldCardPosition}-position-${UiStore.state.cardPosition}`}
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {this.props.children}
      </div>
    )
  }
}

export default Wrapper
