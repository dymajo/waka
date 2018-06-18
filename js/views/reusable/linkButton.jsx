import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'

import { vars } from '../../styles.js'
import { TouchableOpacity } from './touchableOpacity.jsx'

export class LinkButton extends React.Component {
  static propTypes = {
    href: PropTypes.string,
    label: PropTypes.string,
  }
  render() {
    // TODO: This still flickers on iOS.
    // I think there's something dodgy on the user agent stylesheet.
    return (
      <TouchableOpacity
        iOSHacks={true}
        target="_blank"
        accessibilityRole="link"
        href={this.props.href}
      >
        <View style={styles.wrapper}>
          <Text style={styles.text}>{this.props.label}</Text>
        </View>
      </TouchableOpacity>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: vars.accentColor,
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
    paddingLeft: vars.padding * 1.5,
    paddingRight: vars.padding * 1.5,
    borderRadius: 3,
  },
  text: {
    fontFamily: vars.fontFamily,
    fontSize: vars.defaultFontSize,
    letterSpacing: -0.5,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
})
