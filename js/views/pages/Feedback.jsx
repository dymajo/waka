import React, { Component } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { t } from '../../stores/translationStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import LinkButton from '../reusable/LinkButton.jsx'
import { vars, paragraphStyles } from '../../styles.js'
import { getQueryVariable } from '../../helpers/url.js'

const { fontFamily, borderColor, padding } = vars

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingTop: padding / 2,
    paddingBottom: padding,
  },
  label: {
    fontFamily,
    fontWeight: '600',
    fontSize: vars.smallFontSize,
    color: vars.headerColor,
    paddingTop: padding / 2,
  },
  input: {
    fontFamily,
    backgroundColor: '#fff',
    borderColor,
    borderWidth: 1,
    borderStyle: 'solid',
    marginTop: padding / 2,
    marginBottom: padding,
    padding: padding * 0.5,
  },
  form: {
    marginLeft: padding,
    marginRight: padding,
  },
})

class Feedback extends Component {
  sendFeedback() {
    alert('sending...')
  }

  render() {
    return (
      <View style={styles.wrapper}>
        <Header title={t('feedback.header')} />
        <LinkedScroll>
          <View style={styles.content}>
            <Text style={paragraphStyles.p}>
              {t(
                getQueryVariable('type') === 'error-report'
                  ? 'feedback.errorReport'
                  : 'feedback.generalFeedback'
              )}
            </Text>
            <View style={styles.form}>
              <Text
                accessibilityRole="label"
                style={styles.label}
                keyboardType="email-address"
              >
                {t('feedback.email')}
              </Text>
              <TextInput style={styles.input} />
              <Text accessibilityRole="label" style={styles.label}>
                {t('feedback.message')}
              </Text>
              <TextInput style={styles.input} multiline numberOfLines={10} />
              <LinkButton
                label={t('feedback.send')}
                onClick={this.sendFeedback}
              />
            </View>
          </View>
        </LinkedScroll>
      </View>
    )
  }
}
export default Feedback
