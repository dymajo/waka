import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { vars } from '../../styles.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { LinkButton } from '../reusable/linkButton.jsx'

import { Layer } from '../maps/layer.jsx'
import { LineData } from '../../data/lineData.js'
import { LineStops } from './lineStops.jsx'
import { renderShape, renderStops } from './lineCommon.jsx'

class LineWithoutRouter extends React.Component {
  static propTypes = {
    match: PropTypes.object,
  }
  lineData = new LineData({
    region: this.props.match.params.region,
    line_id: this.props.match.params.line_id,
  })
  layer = new Layer()
  pointsLayer = new Layer()
  state = {
    header: '',
    color: '#666',
    stops: [],
    direction: 0,
    lineMetadata: [],
    loading: true,
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
  triggerSwitchDirection = () => {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
    this.layer = new Layer()
    this.pointsLayer = new Layer()
    this.setState({
      direction: !this.state.direction ? 1 : 0,
      loading: true,
    })
    this.getData()
  }
  componentDidMount() {
    this.getData()
  }
  getData() {
    this.lineData.getMeta().then(metadata => {
      const route_color = metadata[this.state.direction].route_color
      this.setState({
        color: route_color,
        lineMetadata: metadata,
      })
      this.lineData.shape_id = metadata[this.state.direction].shape_id
      renderShape(this.lineData, this.layer, route_color)
      renderStops(
        this.lineData,
        this.pointsLayer,
        route_color,
        this.props.match.params.region,
        this.props.match.params.line_id
      ).then(stops => {
        this.setState({ stops: stops, loading: false })
      })
    })
  }
  componentWillUnmount() {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
    this.layer.unmounted = true
    this.pointsLayer.unmounted = true
  }
  render() {
    const currentLine =
      this.state.lineMetadata.length > 0
        ? this.state.lineMetadata[this.state.direction]
        : {}
    const inner = this.state.loading ? (
      <div className="spinner" />
    ) : (
      <React.Fragment>
        <Text style={styles.direction}>
          {this.state.lineMetadata.length <= 1
            ? 'Route Stations'
            : StationStore.getDirection(
                this.props.match.params.region,
                currentLine.direction_id
              ) + ' Route'}
        </Text>
        <LineStops
          color={this.state.color}
          stops={this.state.stops}
          line={this.props.match.params.line_id}
          region={this.props.match.params.region}
        />
        <View style={styles.linkWrapper}>
          {this.state.lineMetadata.length <= 1 ? null : (
            <LinkButton
              label="Change Direction"
              color="secondary"
              onClick={this.triggerSwitchDirection}
            />
          )}
        </View>
      </React.Fragment>
    )

    return (
      <View style={styles.wrapper}>
        <Header
          title={this.props.match.params.line_id}
          subtitle={currentLine.route_long_name || ''}
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
const Line = withRouter(LineWithoutRouter)
export { Line }
