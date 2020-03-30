import React, { Component } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { vars } from '../../../styles.js'
import SettingsStore from '../../../stores/SettingsStore.js'
import Layer from '../../maps/Layer.jsx'
import Spinner from '../../reusable/Spinner.jsx'
import { renderShape, renderStops } from '../lineCommon.jsx'
import LineData from '../../../data/LineData.js'
import { LineStopsRoute } from './LineStopsRoute.jsx'

let styles = null

export class LineStops extends Component {
  constructor(props) {
    super(props)

    const { region } = this.props
    this.lineData = new LineData({ region })
    this.pointsLayer = new Layer()
    this.shapesLayer = null
    this.interpolatedShape = null
    this.isShapeLoaded = false

    this.state = {
      loading: true,
    }
  }

  componentDidMount() {
    this.getStops()
  }

  componentDidUpdate(prevProps) {
    const { tripId } = this.props
    if (tripId !== prevProps.tripId) {
      this.getStops()
    }
  }

  componentWillUnmount() {
    const { pointsLayer, shapesLayer } = this
    shapesLayer.hide(true, true)
    pointsLayer.hide()
    shapesLayer.unmounted = true
    pointsLayer.unmounted = true
  }

  getStops = async () => {
    const { pointsLayer } = this
    const { region, tripId } = this.props
    if (tripId == null) return

    this.lineData.trip_id = tripId
    const { current, next, routeInfo } = await this.lineData.getTripStops()
    this.setState({
      current,
      next,
      color: routeInfo.route_color,
      loading: false,
    })

    renderStops(
      current,
      pointsLayer,
      routeInfo.route_color,
      region,
      routeInfo.route_short_name
    )

    // don't re-request the same shape
    if (this.lineData.shape_id === routeInfo.shape_id) return
    if (this.shapesLayer != null) this.shapesLayer.hide(true, true)
    this.shapesLayer = new Layer()
    this.interpolateShape(current, routeInfo.route_color)
    this.getShape(routeInfo.shape_id, routeInfo.route_color)
  }

  getShape = async (shapeId, color) => {
    this.lineData.shape_id = shapeId
    this.lineData
      .getShape()
      // eslint-disable-next-line promise/prefer-await-to-then
      .then(shape => {
        this.isShapeLoaded = true
        if (this.interpolatedShape) {
          this.shapesLayer.hide(true, true)
          this.shapesLayer = new Layer()
        }
        return renderShape(shape, this.shapesLayer, color)
      })
      .catch(() => {
        // failed to get a shape, so we'll keep the interpolated one
      })
  }

  interpolateShape(stops, color) {
    const { shapesLayer } = this
    if (stops.length === 0) return
    if (this.isShapeLoaded) return
    const shape = {
      type: 'LineString',
      coordinates: stops.map(stop => [stop.stop_lon, stop.stop_lat]),
    }
    this.interpolatedShape = renderShape(
      { ...shape, ...this.lineData.getShapeBounds(shape) },
      shapesLayer,
      color
    )
    this.isShapeLoaded = true
  }

  render() {
    const { line, region, stopId, tripId, realtimeTripUpdate } = this.props
    const { loading, current, next, color } = this.state
    if (loading) {
      return <Spinner />
    }
    return (
      <View>
        <Text style={styles.header}>Stops</Text>
        <LineStopsRoute
          color={color}
          stops={current}
          line={line}
          region={region}
          selectedStop={stopId}
          currentTrip={tripId}
          realtimeStopUpdates={realtimeTripUpdate}
          isTwentyFourHour={SettingsStore.state.isTwentyFourHour}
          nextBlock={next}
        />
      </View>
    )
  }
}

styles = StyleSheet.create({
  header: {
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingBottom: vars.padding * 0.5,
    fontWeight: '600',
    fontSize: vars.defaultFontSize,
    fontFamily: vars.fontFamily,
  },
})
