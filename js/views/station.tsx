import * as React from 'react'

interface ITripItemProps extends React.Props<TripItem> {
  code: string,
  name: string,
  time: string,
  eta: string,
  color: string
}

class TripItem extends React.Component<ITripItemProps, {}> {
  constructor(props: ITripItemProps) {
    super(props)
  }
  public render() {
    return (
      <li><ul>
        <li>
          <div style={{backgroundColor: this.props.color}}>
            {this.props.code}
          </div>
        </li>
        <li>{this.props.time}</li>
        <li>{this.props.name}</li>
        <li>{this.props.eta}</li>
      </ul></li>
    )
  }
}

interface IAppProps extends React.Props<Station> {
  routeParams: {
    station: String
  }
}

class Station extends React.Component<IAppProps, {}> {
  public render() {
    var bgImage = {'backgroundImage': 'url(/a/map/' + this.props.routeParams.station + ')'}
    return (
      <div>
        <header style={bgImage}>
          <div>
            <span className="icon">🚆</span>
            <h1>Britomart</h1>
            <h2>Britomart Train Station, Auckland Central</h2>
          </div>
        </header>
        <ul>
          <TripItem color="#27ae60" code="WEST" time="9:25" name="Swanson" eta="Due" />
          <TripItem color="#9b59b6" code="STH" time="9:25" name="Papakura" eta="Due" />
          <TripItem color="#27ae60" code="WEST" time="9:25" name="Mt Roskill" eta="2 Minutes" />
          <TripItem color="#f39c12" code="ONE" time="9:25" name="Onehunga" eta="4 Minutes" />
          <TripItem color="#27ae60" code="EAST" time="9:25" name="Manakau" eta="" />
        </ul>
      </div>
    )
  }
}
export default Station