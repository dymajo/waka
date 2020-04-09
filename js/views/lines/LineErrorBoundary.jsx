import React, { Component } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { t } from '../../stores/translationStore.js'
import { vars, paragraphStyles } from '../../styles.js'
import Header from '../reusable/Header.jsx'

let styles

export class LineErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err.message }
  }

  render() {
    const { line, forceError, errorMessage } = this.props
    const { hasError, message } = this.state
    if (hasError || forceError) {
      // You can render any custom fallback UI
      return (
        <>
          <Header title={t('errorBoundary.header')} />
          <View style={styles.error}>
            <Text style={[paragraphStyles.errorMessage, styles.bold]}>
              Sorry! We couldn&apos;t load the {line} line.
            </Text>
            <Text style={paragraphStyles.errorMessage}>
              {errorMessage || message}
            </Text>
          </View>
        </>
      )
    }

    const { children } = this.props
    return children
  }
}

const { padding } = vars
styles = StyleSheet.create({
  error: { padding },
  bold: { fontWeight: '600' },
})
