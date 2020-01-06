import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { t } from '../../stores/translationStore.js'
import UiStore from '../../stores/UiStore'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import LinkButton from '../reusable/LinkButton.jsx'
import Spinner from '../reusable/Spinner.jsx'
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

const sendFeedback = async ({
  message,
  contact,
  setError,
  setLoading,
  setSubmitted,
}) => {
  if (message.trim() === '') {
    return
  }
  setLoading(true)
  const payload = {
    type:
      getQueryVariable('type') === 'error-report'
        ? 'error-report'
        : 'general-feedback',
    url: getQueryVariable('url') || window.location.toString(),
    message,
    contact,
  }

  let res
  try {
    res = await fetch('/b/feedback', {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error(err)
    setError(true)
    setLoading(false)
    return
  }

  if (res.status === 200) {
    setSubmitted(true)
  } else {
    const data = await res.text()
    try {
      const json = JSON.parse(data)
      console.error(res.status, json)
    } catch (err) {
      console.error(res.status, err, data)
    }
    setError(true)
  }
  setLoading(false)
}

const Feedback = () => {
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)

  return (
    <View style={styles.wrapper}>
      <Header title={t('feedback.header')} />
      <LinkedScroll>
        <View style={styles.content}>
          {submitted ? (
            <>
              <Text style={paragraphStyles.p}>
                {t(
                  contact === ''
                    ? 'feedback.complete'
                    : 'feedback.completeFollowup'
                )}
              </Text>
              <View style={[styles.content, styles.form]}>
                <LinkButton
                  onClick={() => UiStore.goBack('/')}
                  label={t('feedback.done')}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={paragraphStyles.p}>
                {t(
                  getQueryVariable('type') === 'error-report'
                    ? 'feedback.errorReport'
                    : 'feedback.generalFeedback'
                )}
              </Text>
              <View style={styles.form}>
                <Text accessibilityRole="label" style={styles.label}>
                  {t('feedback.email')}
                </Text>
                <TextInput
                  style={styles.input}
                  value={contact}
                  keyboardType="email-address"
                  onChange={e => setContact(e.currentTarget.value)}
                />
                <Text accessibilityRole="label" style={styles.label}>
                  {t('feedback.message')}
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
                  numberOfLines={10}
                  value={message}
                  onChange={e => setMessage(e.currentTarget.value)}
                />
                {loading ? (
                  <Spinner />
                ) : (
                  <LinkButton
                    label={t('feedback.send')}
                    onClick={() =>
                      sendFeedback({
                        message,
                        contact,
                        setError,
                        setLoading,
                        setSubmitted,
                      })
                    }
                  />
                )}
              </View>
              {error ? (
                <Text style={paragraphStyles.p}>{t('feedback.error')}</Text>
              ) : null}
            </>
          )}
        </View>
      </LinkedScroll>
    </View>
  )
}
export default Feedback
