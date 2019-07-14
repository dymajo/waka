import React from 'react'
import { Text, View, StyleSheet } from 'react-native-web'
import { withRouter } from 'react-router-dom'

import { t } from '../../stores/translationStore.js'
import Header from '../reusable/Header.jsx'
import LinkButton from '../reusable/LinkButton.jsx'
import { vars, paragraphStyles } from '../../styles.js'

let styles

const NoMatch = ({ history }) => {
  return (
    <View style={styles.wrapper}>
      <Header title={t('notFound.header')} />
      <View style={styles.content}>
        <Text style={[paragraphStyles.p, styles.text]}>
          {t('notFound.body')}
        </Text>
        <LinkButton
          onClick={e => history.push('/')}
          label={t('notFound.home')}
        />
      </View>
    </View>
  )
}
const { padding } = vars
styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingTop: padding,
    paddingBottom: padding,
    paddingLeft: padding,
    paddingRight: padding,
  },
  text: {
    paddingLeft: 0,
    paddingRight: 0,
    marginBottom: padding,
  },
})

const NoMatchWithRouter = withRouter(NoMatch)
export default NoMatchWithRouter
