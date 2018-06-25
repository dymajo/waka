import React from 'react'
import { View, Text, StyleSheet, findNodeHandle } from 'react-native'
import PropTypes from 'prop-types'

import { vars } from '../../styles.js'
import { UiStore } from '../../stores/uiStore.js'
import CloseIcon from '../../../dist/icons/close.svg'
import { TouchableOpacity } from './touchableOpacity.jsx'

// not used for all headers yet...
export class Header extends React.Component {
  static propTypes = {
    history: PropTypes.object,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    backFn: PropTypes.func,
    actionIcon: PropTypes.node,
    actionFn: PropTypes.func,
    hideClose: PropTypes.bool,
  }
  wrapper = React.createRef()
  state = {
    layout: 'mobile',
  }

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
    const layout = this.state.layout
    if (document.documentElement.clientWidth > vars.desktopThreshold) {
      if (layout !== 'desktop') {
        this.setState({ layout: 'desktop' })
        UiStore.state.layout = 'desktop'
        UiStore.setCardPosition('max')
      }
    } else if (layout !== 'mobile') {
      this.setState({ layout: 'mobile' })
      UiStore.state.layout = 'mobile'
    }
  }
  render() {
    let subtitleStyle, subtitleElement, actionIcon
    if (typeof this.props.subtitle !== 'undefined') {
      subtitleStyle = {
        lineHeight: vars.headerHeight - paddingVertical * 2 - 18,
      }
      subtitleElement = (
        <Text style={styles.subtitle}>{this.props.subtitle}&nbsp;</Text>
      )
    }
    const pillElement =
      this.state.layout === 'desktop' ? null : <View style={styles.pill} />
    const wrapperStyle =
      this.state.layout === 'desktop'
        ? [styles.wrapper, styles.wrapperDesktop]
        : styles.wrapper

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
    return (
      <View
        style={wrapperStyle}
        ref={this.wrapper}
        onLayout={this.triggerLayout}
      >
        <View style={styles.pillWrapper}>{pillElement}</View>
        <View style={styles.bottomWrapper}>
          <View style={styles.textWrapper}>
            <Text style={[styles.text, subtitleStyle]} numberOfLines={1}>
              {this.props.title}&nbsp;
            </Text>
            {subtitleElement}
          </View>
          {actionIcon}
          {closeIcon}
        </View>
      </View>
    )
  }
}
const paddingVertical = 12
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingBottom: paddingVertical,
    touchAction: 'none',
    boxShadow: '0 -1px 0 rgba(0,0,0,0.1) inset',
  },
  wrapperDesktop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  pillWrapper: {
    height: paddingVertical,
    paddingTop: paddingVertical / 2,
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
