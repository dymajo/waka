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
    showAll: false,
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
    const { loading, error, errorMessage, lineMetadata, showAll } = this.state

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

    // only let through services that have at least 20% of services of the main one
    let filteredServicePatterns = 0
    let baselineServicePatterns = 0
    if (lineMetadata.length > 0) {
      baselineServicePatterns = Math.ceil(lineMetadata[0].services_count * 0.2)
    }
    if (loading) {
      content = <Spinner />
    } else {
      content = (
        <LinkedScroll>
          <View style={styles.lineVariantWrapper}>
            {lineMetadata
              .filter(line => {
                if (!showAll && line.services_count < baselineServicePatterns) {
                  filteredServicePatterns += 1
                  return false
                }
                return true
              })
              .map((line, index) => {
                const routeLongName = line.route_long_name
                  .replace('Via', 'via')
                  .split(' via ')
                const title = routeLongName[0]
                const subtitle = routeLongName.slice(1).join(' via ')
                return (
                  <TouchableOpacity
                    key={line.route_id}
                    style={
                      index === 0
                        ? [styles.lineVariant, styles.lineVariantFirstChild]
                        : styles.lineVariant
                    }
                    onPress={() => {
                      // TODO: Stop Id
                      // Make this a replace, not a push, depending on the referral page
                      UiStore.safePush(
                        `/l/${match.params.region}/${line.agency_id}/${line.route_short_name}?route_id=${line.route_id}&direction=${line.direction_id}`
                      )
                    }}
                  >
                    <Text style={styles.lineVariantText}>{title}</Text>
                    {subtitle !== '' ? (
                      <Text
                        style={[
                          styles.lineVariantText,
                          styles.lineVariantSubtitle,
                        ]}
                      >
                        via {subtitle}
                      </Text>
                    ) : null}

                    <Text style={styles.lineVariantSubtext}>
                      {line.services_count} Service
                      {line.services_count !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            {filteredServicePatterns > 0 ? (
              <TouchableOpacity
                onPress={() => this.setState({ showAll: true })}
                style={styles.showAllWrapper}
              >
                <View style={styles.showAllTextWrapper}>
                  <Text style={styles.showAllText}>
                    Show {filteredServicePatterns} other service{' '}
                    {filteredServicePatterns === 1 ? 'pattern' : 'patterns'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </LinkedScroll>
      )
    }

    return (
      <View style={styles.wrapper}>
        <Header
          title="Service Patterns"
          subtitle={match.params.route_short_name}
        />
        {content}
      </View>
    )
  }
}
const { padding, fontFamily } = vars
styles = StyleSheet.create({
  wrapper: { flex: 1 },
  lineVariantWrapper: {
    paddingBottom: padding,
    paddingTop: padding,
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
  lineVariantSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  lineVariantSubtext: {
    fontSize: 13,
    lineHeight: 22,
    fontFamily,
  },
  showAllWrapper: {
    flexDirection: 'row',
  },
  showAllTextWrapper: {
    marginLeft: vars.padding * 0.75,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: vars.padding * 0.375,
    marginTop: vars.padding * 0.75,
    borderRadius: 3,
    paddingLeft: vars.padding * 0.375,
    paddingRight: vars.padding * 0.375,
    paddingTop: 2,
    paddingBottom: 2,
  },
  showAllText: {
    fontFamily,
    fontWeight: '600',
    color: vars.headerColor,
    fontSize: 13,
  },
})

export default withRouter(LinePicker)
