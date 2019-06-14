import React from 'react'
import { Text, View, StyleSheet } from 'react-native-web'

import { t } from '../../stores/translationStore.js'
import Header from '../reusable/Header.jsx'
import { vars } from '../../styles.js'

class NoMatch extends React.Component {
  render() {
    return (
      <View>
        <Header title={t('notFound.header')} />
        <View style={styles.wrapper}>
          <Text style={styles.text}>{t('notFound.body')}</Text>
        </View>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    paddingTop: vars.padding,
    paddingBottom: vars.padding,
    paddingLeft: vars.padding,
    paddingRight: vars.padding,
  },
  text: {
    fontSize: vars.fontSize,
    fontFamily: vars.fontFamily,
  },
})

export default NoMatch
