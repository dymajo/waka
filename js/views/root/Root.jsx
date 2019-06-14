import React from 'react'
import { View, Text, StyleSheet, findNodeHandle } from 'react-native'
import PropTypes from 'prop-types'

import { vars } from '../../styles'
import { t } from '../../stores/translationStore.js'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import TouchableOpacity from '../reusable/TouchableOpacity.jsx'
import RootContent from './Content.jsx'

import StationIcon from '../../../dist/icons/station.svg'
import LinesIcon from '../../../dist/icons/lines.svg'
import SettingsIcon from '../../../dist/icons/settings.svg'

class Root extends React.Component {
  static propTypes = {
    togglePin: PropTypes.func,
  }

  wrapper = React.createRef()

  state = {
    currentCity: StationStore.currentCity,
  }

  componentDidMount() {
    this.wrapperNode = findNodeHandle(this.wrapper.current)
    this.wrapperNode.addEventListener('touchstart', this.triggerTouchStart)
    StationStore.bind('newcity', this.newcity)
  }

  componentWillUnmount() {
    this.wrapperNode.removeEventListener('touchstart', this.triggerTouchStart)
    StationStore.unbind('newcity', this.newcity)
  }

  newcity = () => {
    this.setState({
      currentCity: StationStore.currentCity,
    })
  }

  toggleStations = () => {
    // the request animation frame fixes a jump on iOS
    requestAnimationFrame(() => {
      UiStore.setCardPosition('toggle')
    })
  }

  toggleLines = () => {
    UiStore.safePush(`/l/${this.state.currentCity.prefix}`)
    if (UiStore.state.cardPosition === 'map') {
      setTimeout(() => {
        UiStore.setCardPosition('default')
      }, 50)
    }
  }

  triggerTouchStart = e => {
    UiStore.state.headerEvent = e.target
  }

  triggerSettings = () => {
    UiStore.safePush('/settings')
  }

  render() {
    return (
      <View style={styles.wrapper}>
        <View
          className="desktop-hide"
          style={styles.headerWrapper}
          ref={this.wrapper}
        >
          <TouchableOpacity
            style={[styles.button, styles.rightBorder]}
            onClick={this.toggleStations}
          >
            <StationIcon style={{ margin: 'auto' }} />
            <Text style={styles.text}>{t('root.stationsLabel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onClick={this.toggleLines}>
            <LinesIcon style={{ margin: 'auto' }} />
            <Text style={styles.text}>{t('root.linesLabel')}</Text>
          </TouchableOpacity>
        </View>
        <Header
          title={t('app.name')}
          className="mobile-hide"
          subtitle={this.state.currentCity.longName}
          hideClose
          actionIcon={<SettingsIcon style={{ fill: vars.headerIconColor }} />}
          actionFn={this.triggerSettings}
          disableTitle
        />
        <LinkedScroll>
          <RootContent togglePin={this.props.togglePin} />
        </LinkedScroll>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  headerWrapper: {
    height: vars.headerHeight,
    touchAction: 'none',
    display: 'flex',
    flexDirection: 'row',
  },
  button: {
    boxShadow: '0 -1px 0 rgba(0,0,0,0.1) inset',
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding * 0.625,
    borderTopRightRadius: 10,
  },
  rightBorder: {
    borderTopRightRadius: 0,
    borderTopLeftRadius: 10,
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

export default Root
