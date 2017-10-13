// @flow

import { Icon, Marker as LeafletMarker, type Layer } from 'leaflet'
import PropTypes from 'prop-types'

import MapLayer from 'react-leaflet/es/MapLayer'
import children from 'react-leaflet/es/propTypes/children'
import latlng from 'react-leaflet/es/propTypes/latlng'
import layer from 'react-leaflet/es/propTypes/layer'
import type { LatLng, MapLayerProps } from 'react-leaflet/types'

// simply extends L.marker
import RotatedMarker from 'leaflet-rotatedmarker'

type LeafletElement = L.marker
type Props = {
  icon?: Icon,
  draggable?: boolean,
  opacity?: number,
  position: LatLng,
  zIndexOffset?: number,
  rotationAngle?: PropTypes.number,
  rotationOrigin?: PropTypes.string,
} & MapLayerProps

export default class Marker extends MapLayer<LeafletElement, Props> {
  static propTypes = {
    children: children,
    draggable: PropTypes.bool,
    icon: PropTypes.instanceOf(Icon),
    opacity: PropTypes.number,
    position: latlng.isRequired,
    zIndexOffset: PropTypes.number,
    rotationAngle: PropTypes.number,
    rotationOrigin: PropTypes.string,
  }

  static childContextTypes = {
    popupContainer: layer,
  }

  getChildContext(): { popupContainer: Layer } {
    return {
      popupContainer: this.leafletElement,
    }
  }

  createLeafletElement(props: Props): LeafletElement {
    return new L.marker(props.position, this.getOptions(props))
  }

  updateLeafletElement(fromProps: Props, toProps: Props) {
    if (toProps.position !== fromProps.position) {
      this.leafletElement.setLatLng(toProps.position)
    }
    if (toProps.icon !== fromProps.icon) {
      this.leafletElement.setIcon(toProps.icon)
    }
    if (toProps.zIndexOffset !== fromProps.zIndexOffset) {
      this.leafletElement.setZIndexOffset(toProps.zIndexOffset)
    }
    if (toProps.opacity !== fromProps.opacity) {
      this.leafletElement.setOpacity(toProps.opacity)
    }
    if (toProps.draggable !== fromProps.draggable) {
      if (toProps.draggable === true) {
        this.leafletElement.dragging.enable()
      } else {
        this.leafletElement.dragging.disable()
      }
    }
    if (toProps.rotationAngle !== fromProps.rotationAngle) {
      this.leafletElement.setRotationAngle(toProps.rotationAngle)
    }
    if (toProps.rotationOrigin !== fromProps.rotationOrigin) {
      this.leafletElement.setRotationOrigin(toProps.rotationOrigin)
    }
  }
}