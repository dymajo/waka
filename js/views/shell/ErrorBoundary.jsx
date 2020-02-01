import React, { Component } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { t } from '../../stores/translationStore.js'
import { vars, paragraphStyles } from '../../styles.js'
import Wrapper from './Wrapper.jsx'
import Header from '../reusable/Header.jsx'
import LinkButton from '../reusable/LinkButton.jsx'

let styles

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // TODO: Log error to an error reporting service
    console.error(error, errorInfo)
  }

  render() {
    const { hasError } = this.state
    if (hasError) {
      // You can render any custom fallback UI
      return (
        <Wrapper>
          <View style={styles.wrapper}>
            <Header title={t('errorBoundary.header')} hideClose />
            <View style={styles.error}>
              <Text style={paragraphStyles.errorMessage}>
                {t('errorBoundary.unexpected')}
              </Text>
              <LinkButton
                href={`/feedback?type=error-report&url=${window.location.toString()}`}
                label={t('errorBoundary.feedback')}
                target="_self"
              />
              <LinkButton
                href={window.location.toString()}
                color="secondary"
                label={t('errorBoundary.reload')}
                target="_self"
              />
              <LinkButton
                color="secondary"
                href="/"
                label={t('errorBoundary.home')}
                target="_self"
              />
            </View>
          </View>
        </Wrapper>
      )
    }

    const { children } = this.props
    return children
  }
}

const { padding, defaultFontSize, fontFamily } = vars
styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  error: {
    padding,
  },
})
