import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

declare function require(name: string): any;
let request = require('reqwest')
let leaflet = require('react-leaflet')
let Map = leaflet.Map
let Marker = leaflet.Marker
let Popup = leaflet.Popup
let TileLayer = leaflet.TileLayer
let ZoomControl = leaflet.ZoomControl
let Icon = require('leaflet').icon
let Circle = leaflet.Circle
let CircleMarker = leaflet.CircleMarker

interface IAppProps extends React.Props<Line>{
    routeParams: {
        line: string
  }
}

interface IAppState{}

class Line extends React.Component<IAppProps, IAppState>{
    public render(){
        return(
        <div>
            {this.props.routeParams.line}
        </div>
        )
    }
}

export default Line