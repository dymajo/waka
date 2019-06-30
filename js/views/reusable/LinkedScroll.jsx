import React from 'react'
import PropTypes from 'prop-types'
import { ScrollView, StyleSheet } from 'react-native'

import UiStore from '../../stores/UiStore.js'
import iOS from '../../helpers/ios.js'

// This component links the scroll to the fancy shell.
let styles
class LinkedScroll extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    onScroll: PropTypes.func,
  }

  constructor(props) {
    super(props)
    this.scrollView = React.createRef()
    this.state = {
      cardPosition: UiStore.state.cardPosition,
      cancelScroll: true,
      desktopLayout: window.innerWidth > 850,
    }
  }

  componentDidMount() {
    UiStore.bind('card-position', this.cardPositionCallback)
    if (iOS.detect()) {
      const node = this.scrollView.current.getScrollableNode()
      node.addEventListener('touchstart', this.scrollViewTouchStart)
      node.children[0].style.minHeight = '101%'
    }
  }

  componentWillUnmount() {
    UiStore.state.scrollPosition = 0
    UiStore.unbind('card-position', this.cardPositionCallback)
    if (iOS.detect()) {
      this.scrollView.current
        .getScrollableNode()
        .removeEventListener('touchstart', this.scrollViewTouchStart)
    }
  }

  cardPositionCallback = position => {
    if (this.state.cardPosition !== position) {
      this.setState({ cardPosition: position })
    }
  }

  scrollViewTouchStart = e => {
    iOS.triggerStart(e, 'bottom')
  }

  // TODO: Perhaps port this to intersection observer
  setScroll = e => {
    this.props.onScroll ? this.props.onScroll(e) : false
    const pos = e.nativeEvent.contentOffset.y

    if (pos === 0 && this.state.cancelScroll === false) {
      this.setState({ cancelScroll: true })
    } else if (pos > 0 && this.state.cancelScroll === true) {
      this.setState({ cancelScroll: false })
    }
    UiStore.state.scrollPosition = pos
  }

  triggerLayout = () => {
    const { desktopLayout } = this.state
    if (window.innerWidth > 850 && desktopLayout === false) {
      this.setState({
        desktopLayout: true,
      })
    } else if (window.innerWidth <= 850 && desktopLayout === true) {
      this.setState({
        desktopLayout: false,
      })
    }
  }

  render() {
    const { desktopLayout } = this.state
    const mobileTouchAction =
      UiStore.state.cardPosition === 'max'
        ? this.state.cancelScroll
          ? iOS.detect()
            ? 'auto' // one day iOS will get support
            : 'pan-down'
          : 'auto'
        : 'none'

    const touchAction = desktopLayout ? 'manipulation' : mobileTouchAction
    const touchStyles = [
      styles.scroll,
      {
        touchAction,
      },
    ]
    return (
      <ScrollView
        onLayout={this.triggerLayout}
        style={touchStyles}
        onScroll={this.setScroll}
        scrollEventThrottle={16}
        ref={this.scrollView}
      >
        {this.props.children}
      </ScrollView>
    )
  }
}
styles = StyleSheet.create({
  scroll: {
    flex: 1,
    // this property doesn't quiite work? maybe it's a bug in android chrome
    overscrollBehavior: 'contain',
    willChange: 'scroll',
  },
})

export default LinkedScroll
