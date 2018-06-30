import React from 'react'

import { Basemap } from './basemap.jsx'

export class MapView extends React.PureComponent {
  constructor(props) {
    super(props)
  }
  render() {
    return <Basemap />
  }
}
