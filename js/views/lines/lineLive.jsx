import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { vars } from '../../styles.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'
import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { LinkButton } from '../reusable/linkButton.jsx'

import { Layer } from '../maps/layer.jsx'
import { LineData } from '../../data/lineData.js'
import { LineStops } from './lineStops.jsx'
import { renderShape, renderStops } from './lineCommon.jsx'

class LiveLineWithoutRouter extends React.Component {
  static propTypes = {
    match: PropTypes.object,
  }
  lineData = new LineData({
    region: this.props.match.params.region,
  })
  layer = new Layer()
  pointsLayer = new Layer()
  state = {
    header: '',
    stops: [],
    direction: 0,
    lineMetadata: [],
    loading: true,
    noMatch: false,
    tripInfo: {},
    stopInfo: {},
  }
  constructor(props) {
    super(props)
    if (
      UiStore.state.lastTransition !== 'backward' &&
      UiStore.state.cardPosition === 'max'
    ) {
      requestAnimationFrame(() => {
        UiStore.setCardPosition('default')
      })
    }
  }
  componentDidMount() {
    this.getData()
  }
  getData() {
    const station = this.props.match.params.station
    const region = this.props.match.params.region
    StationStore.getData(station, region).then(data => {
      const targetId = this.props.match.params.trip_id
      let info = StationStore.tripData.find(item => item.trip_id === targetId)
      if (!info) {
        StationStore.getTimes(station, region).then(() => {
          info = StationStore.tripData.find(item => item.trip_id === targetId)
          if (!info) {
            this.setState({
              loading: false,
              noMatch: true,
            })
          } else {
            this.getShape(
              info.shape_id,
              info.route_color,
              info.route_short_name
            )
            this.setState({
              tripInfo: info,
              loading: false,
            })
          }
        })
        this.setState({
          stopInfo: data,
        })
      } else {
        this.setState({
          tripInfo: info,
          stopInfo: data,
          loading: false,
        })
        this.getShape(info.shape_id, info.route_color, info.route_short_name)
      }
    })
  }
  getShape(shape_id, route_color, line_id) {
    this.lineData.shape_id = shape_id
    renderShape(this.lineData, this.layer, route_color)
    renderStops(
      this.lineData,
      this.pointsLayer,
      route_color,
      this.props.match.params.region,
      line_id
    ).then(stops => {
      this.setState({ stops: stops, loading: false })
    })
  }
  componentWillUnmount() {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
  }
  render() {
    const inner = this.state.loading ? (
      <div className="spinner" />
    ) : this.state.noMatch ? (
      <View>
        <Text style={styles.direction}>This service could not be found.</Text>
      </View>
    ) : (
      <React.Fragment>
        <Text style={styles.direction}>Stations</Text>
        <LineStops
          color={this.state.tripInfo.route_color}
          stops={this.state.stops}
          line={this.state.tripInfo.route_short_name}
          region={this.props.match.params.region}
        />
      </React.Fragment>
    )

    return (
      <View style={styles.wrapper}>
        <Header
          title={this.state.tripInfo.route_short_name}
          subtitle={this.state.tripInfo.route_long_name || ''}
        />
        <LinkedScroll>{inner}</LinkedScroll>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  direction: {
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingBottom: vars.padding * 0.5,
    fontWeight: '600',
    fontSize: vars.defaultFontSize,
    fontFamily: vars.defaultFontFamily,
  },
  linkWrapper: {
    padding: vars.padding,
  },
})
const LiveLine = withRouter(LiveLineWithoutRouter)
export { LiveLine }
