import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { Header } from '../reusable/header.jsx'

class LineWithoutRouter extends React.Component {
  render() {
    const line = this.props.match.params.line_id
    return (
      <View style={styles.wrapper}>
        <Header title={line} />
        <Text>This is the new lines view.</Text>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})
const Line = withRouter(LineWithoutRouter)
export { Line }
