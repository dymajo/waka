import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { vars } from '../../styles.js'

const { accentColor, padding } = vars
const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: padding,
    paddingTop: padding,
  },
})
const { wrapper } = styles
const Spinner = () => (
  <View style={wrapper}>
    <ActivityIndicator color={accentColor} />
  </View>
)
export default Spinner
