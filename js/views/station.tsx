import * as React from 'react'
declare function require(name: string): any;
let request = require('reqwest')

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
    var arrival = new Date()
    arrival.setHours(0)
    arrival.setMinutes(0)
    arrival.setSeconds(parseInt(this.props.time))

    // makes times like 4:9 -> 4:09
    var minutes = arrival.getMinutes().toString()
    if (arrival.getMinutes() < 10) {
      minutes = '0' + minutes.toString()
    }
    var timestring = arrival.getHours() + ':' + minutes

    return (
      <li><ul>
        <li>
          <div style={{backgroundColor: this.props.color}}>
            {this.props.code}
          </div>
        </li>
        <li>{timestring}</li>
        <li>{this.props.name}</li>
        <li>{this.props.eta}</li>
      </ul></li>
    )
  }
}

interface ServerTripItem {
  arrival_time_seconds: string,
  stop_sequence: string,
  trip_id: string,
  route_long_name: string,
  agency_id: string,
  direction_id: string,
  end_date: string,
  frequency: string,
  route_short_name: string,
  route_type: string,
  start_date: string,
  trip_headsign: string
}

interface IAppProps extends React.Props<Station> {
  routeParams: {
    station: string
  }
}
interface IAppState {
  name: string,
  stop: string,
  trips: Array<ServerTripItem>
}

class Station extends React.Component<IAppProps, IAppState> {
  public state : IAppState

  constructor(props: IAppProps) {
    super(props)
    this.state = {
      name: '',
      stop: '',
      trips: []
    }
  }
  private getData(newProps) {
    var tripsSort = function(a,b) {
      return a.arrival_time_seconds - b.arrival_time_seconds
    }
    request(`/a/station/${newProps.routeParams.station}`).then((data) => {
      this.setState({
        // because typescript is dumb, you have to repass
        name: data.stop_name,
        stop: this.props.routeParams.station,
        trips: this.state.trips
      })
    })
    request(`/a/station/${newProps.routeParams.station}/times`).then((data) => {
      data.trips.sort(tripsSort)
      console.log(data)
      this.setState({
        // because typescript is dumb, you have to repass
        name: this.state.name,
        stop: this.state.stop,
        trips: data.trips
      })
    })
  }
  public componentDidMount() {
    console.log('component mounted')
    this.getData(this.props)
  }
  public componentWillReceiveProps(newProps) {
    console.log('component new props')
    this.getData(newProps)
    this.setState({
      name: '',
      stop: '',
      trips: []
    })
  }
  public render() {
    var bgImage = {'backgroundImage': 'url(/a/map/' + this.props.routeParams.station + ')'}
    var slug
    if (this.state.stop != '') {
      slug = 'Stop ' + this.state.stop + ' / ' + this.state.name
    }

    return (
      <div>
        <header style={bgImage}>
          <div>
            <span className="icon">🚆</span>
            <h1>{this.state.name}</h1>
            <h2>{slug}</h2>
          </div>
        </header>
        <ul>
          {this.state.trips.map(function(trip) {
            return <TripItem 
              color="#27ae60"
              code={trip.route_short_name}
              time={trip.arrival_time_seconds}
              name={trip.trip_headsign}
              key={trip.trip_id}
              eta=""
             />
          })}
        </ul>
      </div>
    )
  }
}
export default Station