import React from 'react'
import { View, Text, StyleSheet, findNodeHandle } from 'react-native'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import { vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { TouchableOpacity } from '../reusable/touchableOpacity.jsx'
import { RootContent } from './content.jsx'

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
    document.title = t('app.name')
  }
  wrapper = React.createRef()

  componentDidMount() {
    this.wrapperNode = findNodeHandle(this.wrapper.current)
    this.wrapperNode.addEventListener('touchstart', this.triggerTouchStart)
  }
  componentWillUnmount() {
    this.wrapperNode.removeEventListener('touchstart', this.triggerTouchStart)
  }
  toggleLines = () => {
    UiStore.safePush('/l/' + StationStore.currentCity)
  }
  triggerTouchStart = e => {
    UiStore.state.headerEvent = e.target
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <View style={styles.headerWrapper} ref={this.wrapper}>
          <TouchableOpacity
            style={[styles.button, styles.rightBorder]}
            onClick={() => this.props.toggleStations('toggle')}
          >
            <StationIcon style={{ margin: 'auto' }} />
            <Text style={styles.text}>{t('root.stationsLabel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onClick={this.toggleLines}>
            <LinesIcon style={{ margin: 'auto' }} />
            <Text style={styles.text}>{t('root.linesLabel')}</Text>
          </TouchableOpacity>
        </View>
        <LinkedScroll>
          <RootContent togglePin={this.props.togglePin} />
        </LinkedScroll>
      </View>
    )
  }
}
const Root = withRouter(RootView)
export { Root }

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
  },
  headerWrapper: {
    height: vars.headerHeight,
    backgroundColor: '#fff',
    touchAction: 'none',
    boxShadow: '0 -1px 0 rgba(0,0,0,0.1) inset',
    display: 'flex',
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
  },
  rightBorder: {
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: '#eee',
  },
  text: {
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: vars.smallFontSize - 1,
    fontWeight: '700',
    fontFamily: vars.fontFamily,
  },
})
