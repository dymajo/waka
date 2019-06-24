import React from 'react'
import { View, Text, StyleSheet, findNodeHandle } from 'react-native'
import PropTypes from 'prop-types'

import { vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'
import UiStore from '../../stores/UiStore'
import CloseIcon from '../../../dist/icons/close.svg'
import TouchableOpacity from './TouchableOpacity.jsx'

let styles
const paddingVertical = 12

class Header extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    backFn: PropTypes.func,
    actionIcon: PropTypes.node,
    actionFn: PropTypes.func,
    hideClose: PropTypes.bool,
    disableTitle: PropTypes.bool,
  }

  state = {
    desktopLayout: window.innerWidth > 850,
  }

  wrapper = React.createRef()

  componentDidMount() {
    this.wrapperNode = findNodeHandle(this.wrapper.current)
    this.wrapperNode.addEventListener('touchstart', this.triggerTouchStart)
  }

  componentWillUnmount() {
    this.wrapperNode.removeEventListener('touchstart', this.triggerTouchStart)
  }

  triggerBack = () => {
    UiStore.goBack('/')
  }

  triggerTouchStart = e => {
    UiStore.state.headerEvent = e.target
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

  triggerMax() {
    requestAnimationFrame(() => {
      const pos =
        UiStore.state.cardPosition === 'map' ||
        UiStore.state.cardPosition === 'max'
          ? 'default'
          : 'max'
      UiStore.setCardPosition(pos, true, true)
    })
  }

  render() {
    let subtitleStyle

    let subtitleElement

    let actionIcon = null

    if (this.props.className) {
      console.error('ClassName is Deprecated!')
    }

    const { desktopLayout } = this.state

    const title = [t('app.name')]
    if (typeof this.props.subtitle !== 'undefined') {
      subtitleStyle = {
        lineHeight: vars.headerHeight - paddingVertical * 2 - 18,
      }
      subtitleElement = (
        <Text numberOfLines={1} style={styles.subtitle}>
          {this.props.subtitle}
          &nbsp;
        </Text>
      )
      title.unshift(this.props.subtitle)
    }
    if (typeof this.props.title !== 'undefined') {
      title.unshift(this.props.title)
    }
    document.title = this.props.disableTitle ? t('app.name') : title.join(' - ')

    if (typeof this.props.actionIcon !== 'undefined') {
      const style =
        this.props.hideClose === true ? styles.close : styles.secondary
      actionIcon = (
        <TouchableOpacity style={style} onClick={this.props.actionFn}>
          <View style={styles.iconInner}>{this.props.actionIcon}</View>
        </TouchableOpacity>
      )
    }
    const closeIcon =
      this.props.hideClose === true ? null : (
        <TouchableOpacity
          style={styles.close}
          onClick={this.props.backFn || this.triggerBack}
        >
          <View style={styles.iconInner}>
            <CloseIcon style={{ fill: vars.headerIconColor }} />
          </View>
        </TouchableOpacity>
      )
    const pillWrapperStyles = desktopLayout
      ? [styles.pillWrapper, styles.invisible]
      : actionIcon && closeIcon
      ? [styles.pillWrapper, styles.pillWrapperExtra]
      : styles.pillWrapper
    return (
      <View
        style={
          desktopLayout
            ? [styles.wrapper, styles.wrapperDesktop]
            : styles.wrapper
        }
        ref={this.wrapper}
        onResize={this.triggerResize}
        onLayout={this.triggerLayout}
      >
        <View style={styles.flexWrapper} onClick={this.triggerMax}>
          <View style={pillWrapperStyles}>
            <View style={styles.pill} />
          </View>
          <View style={styles.bottomWrapper}>
            <View style={styles.textWrapper}>
              <Text style={[styles.text, subtitleStyle]} numberOfLines={1}>
                {this.props.title}
                &nbsp;
              </Text>
              {subtitleElement}
            </View>
          </View>
        </View>
        {actionIcon}
        {closeIcon}
      </View>
    )
  }
}
styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    touchAction: 'none',
    boxShadow: '0 -1px 0 rgba(0,0,0,0.1) inset',
    flexDirection: 'row',
  },
  wrapperDesktop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  flexWrapper: {
    flex: 1,
    paddingBottom: paddingVertical,
  },
  pillWrapper: {
    height: paddingVertical,
    paddingTop: paddingVertical / 2,
    paddingLeft: 44,
  },
  pillWrapperExtra: {
    paddingLeft: 88,
  },
  invisible: {
    visibility: 'hidden',
  },
  pill: {
    backgroundColor: '#d8d8d8',
    width: 36,
    height: 5,
    borderRadius: 5,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  bottomWrapper: {
    display: 'flex',
    flexDirection: 'row',
  },
  textWrapper: {
    flex: 1,
    paddingLeft: vars.padding,
  },
  text: {
    fontFamily: vars.fontFamily,
    lineHeight: vars.headerHeight - paddingVertical * 2,
    color: vars.headerColor,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: vars.fontFamily,
    lineHeight: 18,
    fontSize: 14,
    color: '#444',
  },
  secondary: {
    paddingLeft: vars.padding * 0.875,
    paddingRight: vars.padding * 0.375,
  },
  close: {
    paddingLeft: vars.padding * 0.375,
    paddingRight: vars.padding * 0.875,
  },
  iconInner: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
})
export default Header
