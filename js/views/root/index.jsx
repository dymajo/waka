import React from 'react'
import { View, Text, StyleSheet, findNodeHandle } from 'react-native'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import { vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { TouchableOpacity } from '../reusable/touchableOpacity.jsx'
import { RootContent } from './content.jsx'

import StationIcon from '../../../dist/icons/station.svg'
import LinesIcon from '../../../dist/icons/lines.svg'
import SettingsIcon from '../../../dist/icons/settings.svg'

class RootView extends React.Component {
  static propTypes = {
    togglePin: PropTypes.func,
    toggleStations: PropTypes.func,
    toggleRegion: PropTypes.func,
    location: PropTypes.object,
    history: PropTypes.object,
  }
  state = {
    layout: 'mobile'
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
    if (UiStore.state.cardPosition === 'map') {
      setTimeout(() => {
        this.props.toggleStations('default')
      }, 50)
    }
  }
  triggerTouchStart = e => {
    UiStore.state.headerEvent = e.target
  }
  triggerSettings = () => {
    UiStore.safePush('/settings')
  }
  triggerLayout = () => {
    const layout = this.state.layout
    if (document.documentElement.clientWidth > 850) {
      if (layout !== 'desktop') {
        this.setState({ layout: 'desktop' })
      }
    } else if (layout !== 'mobile') {
      this.setState({ layout: 'mobile' })
    }
  }
  render() {
    const header = this.state.layout === 'mobile' ? (
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
    ) : (      
      <Header
        title={t('app.name')}
        subtitle={StationStore.currentCity === 'none' ? '' : t('regions.' + StationStore.currentCity + '-long')}
        hideClose={true}
        actionIcon={<SettingsIcon style={{ fill: vars.headerIconColor }} />}
        actionFn={this.triggerSettings}
      />
    )
    return (
      <View style={styles.wrapper} onLayout={this.triggerLayout}>
        {header}
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
