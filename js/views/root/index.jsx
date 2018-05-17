import React from 'react'
import { View, StyleSheet } from 'react-native'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import { t } from '../../stores/translationStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'

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
  toggleLines = () => {
    if (this.props.location.pathname !== '/') {
      return
    }
    this.props.history.push('/l/' + StationStore.currentCity)
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
        <LinkedScroll>
          <SavedStations
            togglePin={this.props.togglePin}
            toggleRegion={this.props.toggleRegion}
          />
        </LinkedScroll>
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
})
