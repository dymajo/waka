import React from 'react'
import PropTypes from 'prop-types'
import { ScrollView, StyleSheet } from 'react-native'

import { UiStore } from '../../stores/uiStore.js'
import { iOS } from '../../models/ios.js'

// This component links the scroll to the fancy shell.
export class LinkedScroll extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  }
  constructor(props) {
    super(props)
    this.scrollView = React.createRef()
  }
  componentDidMount() {
    this.scrollView.current
      .getScrollableNode()
      .addEventListener('touchstart', this.scrollViewTouchStart)
  }
  componentWillUnmount() {
    this.scrollView.current
      .getScrollableNode()
      .removeEventListener('touchstart', this.scrollViewTouchStart)
  }
  scrollViewTouchStart = e => {
    iOS.triggerStart(e, 'bottom')
  }
  setScroll = e => {
    UiStore.state.scrollPosition = e.nativeEvent.contentOffset.y
  }
  render() {
    return (
      <ScrollView
        style={styles.scroll}
        onScroll={this.setScroll}
        scrollEventThrottle={50}
        ref={this.scrollView}
      >
        {this.props.children}
      </ScrollView>
    )
  }
}
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
})
