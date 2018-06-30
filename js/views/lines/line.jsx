import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

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
  state = {
    header: '',
    stops: [],
  }
  componentDidMount() {
    this.layer.show()
    this.lineData.getMeta().then(metadata => {
      this.setState({
        header: metadata[0].route_long_name,
      })
      this.lineData.shape_id = metadata[0].shape_id
      this.lineData.getShape().then(shape => {
        this.layer.add('geojson', shape)
      })
      this.lineData.getStops().then(stops => {
        this.setState({ stops: stops })
        this.layer.add('points', stops)
      })
    })
  }
  componentWillUnmount() {
    this.layer.hide()
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <Header title={this.state.header} />
        {this.state.stops.map(stop => {
          return (
            <Text key={stop.stop_id}>
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
