import React from 'react'
import { View, Text, StyleSheet, findNodeHandle } from 'react-native'
import PropTypes from 'prop-types'

import { vars } from '../../styles.js'
import { UiStore } from '../../stores/uiStore.js'
import CloseIcon from '../../../dist/icons/close.svg'
import { TouchableOpacity } from './touchableOpacity.jsx'

// not used for all headers yet...
class Header extends React.Component {
  static propTypes = {
    history: PropTypes.object,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    backFn: PropTypes.func,
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
  render() {
    let subtitleStyle, subtitleElement
    if (typeof this.props.subtitle !== 'undefined') {
      subtitleStyle = {
        lineHeight: vars.headerHeight - paddingVertical * 2 - 18,
      }
      subtitleElement = (
        <Text style={styles.subtitle}>{this.props.subtitle}&nbsp;</Text>
      )
    }
    return (
      <View style={styles.wrapper} ref={this.wrapper}>
        <View style={styles.pillWrapper}>
          <View style={styles.pill} />
        </View>
        <View style={styles.bottomWrapper}>
          <View style={styles.textWrapper}>
            <Text style={[styles.text, subtitleStyle]} numberOfLines={1}>
              {this.props.title}&nbsp;
            </Text>
            {subtitleElement}
          </View>
          <TouchableOpacity
            style={styles.close}
            onClick={this.props.backFn || this.triggerBack}
          >
            <View style={styles.closeIcon}>
              <CloseIcon style={{ fill: vars.headerColor }} />
            </View>
          </TouchableOpacity>
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
  },
  close: {
    paddingLeft: vars.padding * 0.75,
    paddingRight: vars.padding * 0.75,
  },
  closeIcon: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
})
export default Header
