import React, { Component } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { withRouter } from 'react-router'
import queryString from 'query-string'

import { vars } from '../../styles.js'
import UiStore from '../../stores/UiStore.js'
import LineData from '../../data/LineData.js'
import Header from '../reusable/Header.jsx'
import Spinner from '../reusable/Spinner.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'

let styles

class LinePicker extends Component {
  state = {
    loading: true,
    error: false,
    errorMessage: '',
    lineMetadata: [],
  }

  constructor(props) {
    super(props)

    const { match } = this.props

    // don't want to parse out the direction or route_id, because we want all route combos

    this.lineData = new LineData({
      region: match.params.region,
      route_short_name: match.params.route_short_name,
      agency_id: match.params.agency_id,
    })
  }

  componentDidMount() {
    this.getData()
  }

  async getData() {
    try {
      const lineMetadata = await this.lineData.getMeta()
      if (lineMetadata.length === 0) {
        throw new Error('The line was not found.')
      }
      this.setState({ error: false, loading: false, lineMetadata })
    } catch (err) {
      console.error(err)
      this.setState({
        error: true,
        errorMessage: err.message,
      })
    }
  }

  render() {
    const { match } = this.props
    const { loading, error, errorMessage, lineMetadata } = this.state

    let content = null
    if (error) {
      content = (
        <View style={styles.wrapper}>
          <Header title="Line Error" />
          <View style={styles.error}>
            <Text style={styles.errorMessage}>
              We couldn&apos;t load the {match.params.route_short_name} line in{' '}
              {match.params.region}.
            </Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        </View>
      )
    }

    if (loading) {
      content = <Spinner />
    } else {
      content = (
        <LinkedScroll>
          <View style={styles.lineVariantWrapper}>
            {lineMetadata.map((line, index) => (
              <TouchableOpacity
                key={line.route_id}
                style={
                  index === 0
                    ? [styles.lineVariant, styles.lineVariantFirstChild]
                    : styles.lineVariant
                }
                onClick={() => {
                  // TODO: Stop Id
                  // Make this a replace, not a push, depending on the referral page
                  UiStore.safePush(
                    `/l/${match.params.region}/${line.agency_id}/${line.route_short_name}?route_id=${line.route_id}&direction=${line.direction_id}`
                  )
                }}
              >
                <Text style={styles.lineVariantText}>
                  {line.route_long_name}
                </Text>
                <Text style={styles.lineVariantSubtext}>
                  {line.services_count} Service
                  {line.services_count !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinkedScroll>
      )
    }

    return (
      <View style={styles.wrapper}>
        <Header title="Pick Line" subtitle={match.params.route_short_name} />
        {content}
      </View>
    )
  }
}
const { padding, fontFamily } = vars
styles = StyleSheet.create({
  wrapper: { flex: 1 },
  lineVariantWrapper: {
    paddingTop: padding,
    paddingBottom: padding,
  },
  lineVariantFirstChild: {
    borderTopWidth: 1,
  },
  lineVariant: {
    paddingTop: padding,
    paddingBottom: padding,
    paddingLeft: padding,
    paddingRight: padding,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: vars.borderColor,
  },
  lineVariantText: {
    fontSize: 14,
    color: vars.headerColor,
    fontWeight: '600',
    fontFamily,
  },
  lineVariantSubtext: {
    fontFamily,
  },
})

export default withRouter(LinePicker)
