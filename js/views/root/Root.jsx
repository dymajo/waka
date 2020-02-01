import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import PropTypes from 'prop-types'

import { vars } from '../../styles'
import { t } from '../../stores/translationStore.js'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import RootContent from './Content.jsx'

import StationIcon from '../../../dist/icons/station.svg'
import LinesIcon from '../../../dist/icons/lines.svg'
import SettingsIcon from '../../../dist/icons/settings.svg'
import GuidebookIcon from '../../../dist/icons/guidebook.svg'

const { desktopThreshold } = vars
let styles

class Root extends React.Component {
  static propTypes = {
    togglePin: PropTypes.func,
  }

  wrapper = React.createRef()

  state = {
    currentCity: StationStore.currentCity,
    desktopLayout: window.innerWidth > desktopThreshold,
  }

  componentDidMount() {
    StationStore.bind('newcity', this.newcity)
  }

  componentWillUnmount() {
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

  triggerUrl = url => {
    return () => {
      const { currentCity } = this.state
      UiStore.safePush(`${url}${currentCity.prefix || 'nz-akl'}`)
      if (UiStore.state.cardPosition === 'map') {
        setTimeout(() => {
          UiStore.setCardPosition('default')
        }, 50)
      }
    }
  }

  triggerSettings = () => {
    UiStore.safePush('/settings')
  }

  triggerLayout = () => {
    const { desktopLayout } = this.state
    if (window.innerWidth > desktopThreshold && desktopLayout === false) {
      this.setState({
        desktopLayout: true,
      })
    } else if (
      window.innerWidth <= desktopThreshold &&
      desktopLayout === true
    ) {
      this.setState({
        desktopLayout: false,
      })
    }
  }

  render() {
    const { desktopLayout, currentCity } = this.state
    return (
      <View style={styles.wrapper} onLayout={this.triggerLayout}>
        {desktopLayout ? (
          <Header
            title={t('app.name')}
            subtitle={currentCity.longName}
            hideClose
            actionIcon={<SettingsIcon style={{ fill: vars.headerIconColor }} />}
            actionFn={this.triggerSettings}
            disableTitle
          />
        ) : (
          <View style={styles.headerWrapper} ref={this.wrapper}>
            <TouchableOpacity
              style={[styles.button, styles.rightBorder]}
              onClick={this.toggleStations}
            >
              <StationIcon style={{ margin: 'auto' }} />
              <Text style={styles.text}>{t('root.stationsLabel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                currentCity.prefix === 'nz-wlg'
                  ? [styles.button, styles.rightBorder]
                  : styles.button
              }
              onClick={this.triggerUrl('/l/')}
            >
              <LinesIcon style={{ margin: 'auto' }} />
              <Text style={styles.text}>{t('root.linesLabel')}</Text>
            </TouchableOpacity>
            {currentCity.prefix === 'nz-wlg' ? (
              <TouchableOpacity
                style={styles.button}
                onClick={this.triggerUrl('/guide/')}
              >
                <GuidebookIcon style={{ margin: 'auto' }} />
                <Text style={styles.text}>{t('root.guideLabel')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        <LinkedScroll>
          <RootContent togglePin={this.props.togglePin} />
        </LinkedScroll>
      </View>
    )
  }
}

styles = StyleSheet.create({
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
    color: vars.headerColor,
  },
})

export default Root
