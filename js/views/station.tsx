import * as React from 'react'

interface IAppProps extends React.Props<Station> {
  routeParams: {
    station: String
  }
}

class Station extends React.Component<IAppProps, {}> {
  public render() {
    return (
      <div>This is {this.props.routeParams.station} station</div>
    )
  }
}
export default Station