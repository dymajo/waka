import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { UiStore } from '../../stores/uiStore.js'
import { Header } from '../reusable/header.jsx'
import { Layer } from '../maps/layer.jsx'
import { LineData } from '../../data/lineData.js'

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
    stops: [],
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
    this.lineData.getMeta().then(metadata => {
      const route_color = metadata[0].route_color
      this.setState({
        header: metadata[0].route_long_name,
      })
      this.lineData.shape_id = metadata[0].shape_id
      this.lineData.getShape().then(shape => {
        this.layer.add('geojson', shape, {
          color: route_color,
          className: 'line',
          order: 'back',
        })
        this.layer.show(shape.bounds, true, false)
      })
      this.lineData.getStops().then(stops => {
        this.setState({ stops: stops })

        const geojson = {
          type: 'MultiPoint',
          coordinates: [],
        }
        stops.forEach(stop => {
          geojson.coordinates.push([stop.stop_lon, stop.stop_lat])
        })
        this.pointsLayer.add('geojson', geojson, {
          typeExtension: 'CircleMarker',
          typeExtensionOptions: {
            className: 'metro-dot',
            color: route_color,
            radius: 7,
          },
          maxZoom: 5,
        })
        this.pointsLayer.add('geojson', geojson, {
          typeExtension: 'InvisibleMarker',
          typeExtensionOptions: {
            zIndexOffset: 30,
          },
        })
        this.pointsLayer.show()
      })
    })
  }
  componentWillUnmount() {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <Header title={this.state.header} />
        {this.state.stops.map(stop => {
          return (
            <Text key={stop.stop_sequence}>
              {stop.stop_id} - {stop.stop_name}
            </Text>
          )
        })}
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
