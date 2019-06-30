import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

import iOS from '../../helpers/ios.js'
import { vars } from '../../styles.js'

let styles
class LinkButton extends React.Component {
  static propTypes = {
    href: PropTypes.string,
    label: PropTypes.string,
    onClick: PropTypes.func,
    color: PropTypes.string,
    size: PropTypes.string,
  }

  triggerLink = () => {
    if (this.props.href.split(':')[0] === 'mailto') {
      window.location = this.props.href
    } else {
      window.open(this.props.href)
    }
  }

  render() {
    let wrapperStyle = null
    let textStyle = null
    if (this.props.size === 'small') {
      wrapperStyle =
        this.props.color === 'secondary'
          ? [styles.wrapper, styles.wrapperSecondary, styles.wrapperSmall]
          : [styles.wrapper, styles.wrapperSmall]
      textStyle =
        this.props.color === 'secondary'
          ? [styles.text, styles.textSecondary, styles.textSmall]
          : [styles.text, styles.textSmall]
    } else {
      wrapperStyle =
        this.props.color === 'secondary'
          ? [styles.wrapper, styles.wrapperSecondary]
          : styles.wrapper
      textStyle =
        this.props.color === 'secondary'
          ? [styles.text, styles.textSecondary]
          : styles.text
    }

    const inner = (
      <View style={wrapperStyle}>
        <Text style={textStyle}>{this.props.label}</Text>
      </View>
    )
    if (this.props.href && iOS.detect()) {
      return (
        <TouchableOpacity
          iOSHacks
          activeOpacity={75}
          onClick={this.triggerLink}
        >
          {inner}
        </TouchableOpacity>
      )
    }
    if (this.props.href) {
      return (
        <TouchableOpacity
          activeOpacity={75}
          target="_blank"
          accessibilityRole="link"
          href={this.props.href}
        >
          {inner}
        </TouchableOpacity>
      )
    }
    return (
      <TouchableOpacity onClick={this.props.onClick}>{inner}</TouchableOpacity>
    )
  }
}
styles = StyleSheet.create({
  wrapper: {
    backgroundColor: vars.accentColor,
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
    paddingLeft: vars.padding * 1.5,
    paddingRight: vars.padding * 1.5,
    borderRadius: 3,
    marginBottom: vars.padding / 2,
    touchAction: 'manipulation',
  },
  wrapperSmall: {
    paddingTop: vars.padding * 0.25,
    paddingBottom: vars.padding * 0.25,
    paddingLeft: vars.padding * 0.75,
    paddingRight: vars.padding * 0.75,
    marginBottom: 0,
  },
  wrapperSecondary: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: vars.borderColor,
  },
  text: {
    fontFamily: vars.fontFamily,
    fontSize: vars.defaultFontSize,
    letterSpacing: -0.5,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  textSmall: {
    fontSize: vars.smallFontSize,
    fontWeight: 'normal',
    letterSpacing: 0,
  },
  textSecondary: {
    color: '#000',
  },
})

export default LinkButton
