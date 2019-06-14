import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native'
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

export default Wrapper
