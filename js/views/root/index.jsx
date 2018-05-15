import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import { t } from '../../stores/translationStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { iOS } from '../../models/ios.js'

import SavedStations from '../savedstations.jsx'
import StationIcon from '../../../dist/icons/station.svg'
import LinesIcon from '../../../dist/icons/lines.svg'

class RootView extends React.Component {
  static propTypes = {
    togglePin: PropTypes.func,
    toggleStations: PropTypes.func,
    toggleRegion: PropTypes.func,
    location: PropTypes.object,
    history: PropTypes.object,
  }
  constructor(props) {
    super(props)
    this.scrollView = React.createRef()
  }
  componentDidMount() {
    this.scrollView.current
      .getScrollableNode()
      .addEventListener('touchstart', this.scrollViewTouchStart)
    this.scrollView.current.getInnerViewNode().style.transform =
      'translate3d(0,0,0)'
  }
  componentWillUnmount() {
    this.scrollView.current
      .getScrollableNode()
      .removeEventListener('touchstart', this.scrollViewTouchStart)
  }
  toggleLines = () => {
    if (this.props.location.pathname !== '/') {
      return
    }
    this.props.history.push('/l/' + StationStore.currentCity)
  }
  scrollViewTouchStart = e => {
    iOS.triggerStart(e, 'bottom')
  }
  setScroll = e => {
    UiStore.state.scrollPosition = e.nativeEvent.contentOffset.y
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <div className="root-card-bar">
          <button onTouchTap={() => this.props.toggleStations('toggle')}>
            <StationIcon />
            {t('root.stationsLabel')}
          </button>
          <button onTouchTap={this.toggleLines}>
            <LinesIcon />
            {t('root.linesLabel')}
          </button>
        </div>
        <ScrollView
          style={styles.scroll}
          onScroll={this.setScroll}
          scrollEventThrottle={50}
          ref={this.scrollView}
        >
          <SavedStations
            togglePin={this.props.togglePin}
            toggleRegion={this.props.toggleRegion}
          />
        </ScrollView>
      </View>
    )
  }
}
const Root = withRouter(RootView)
export { Root }

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
})
