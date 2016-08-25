import * as React from 'react'
declare function require(name: string): any;
let request = require('reqwest')

interface RealTimeItem {
  delay: number,
  stop_sequence: number,
  timestamp: number 
}
interface RealTimeMap {
  [name: string]: RealTimeItem;
}

interface ITripItemProps extends React.Props<TripItem> {
  code: string,
  name: string,
  time: string,
  trip_id: string,
  stop_sequence: number,
  color: string,
  realtime: RealTimeItem
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
    var stops_away = ''
    if (this.props.realtime) {
      stops_away = (this.props.stop_sequence - this.props.realtime.stop_sequence).toString() + ' stops away'
    }

    return (
      <li><ul>
        <li>
          <div style={{backgroundColor: this.props.color}}>
            {this.props.code}
          </div>
        </li>
        <li>{timestring}</li>
        <li>{this.props.name}</li>
        <li>{stops_away}</li>
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
  trips: Array<ServerTripItem>,
  realtime: RealTimeMap
}

class Station extends React.Component<IAppProps, IAppState> {
  public state : IAppState

  constructor(props: IAppProps) {
    super(props)
    this.state = {
      name: '',
      stop: '',
      trips: [],
      realtime: {}
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
        trips: this.state.trips,
        realtime: this.state.realtime
      })
    })
    request(`/a/station/${newProps.routeParams.station}/times`).then((data) => {
      data.trips.sort(tripsSort)
      console.log(data)
      this.setState({
        // because typescript is dumb, you have to repass
        name: this.state.name,
        stop: this.state.stop,
        trips: data.trips,
        realtime: this.state.realtime
      })

      var queryString = []
      data.trips.forEach(function(trip) {
        var arrival = new Date()
        arrival.setHours(0)
        arrival.setMinutes(0)
        arrival.setSeconds(parseInt(trip.arrival_time_seconds))

        // only gets realtime info for things +30mins away
        if (arrival.getTime() < (new Date().getTime() + 1800000)) {
          queryString.push(trip.trip_id)
        }
      })

      // now we do a request to the realtime API
      request({
        method: 'post',
        type: 'json',
        contentType: 'application/json',
        url: `/a/realtime`,
        data: JSON.stringify({trips: queryString})
      }).then((rtData) => {
        this.setState({
          // because typescript is dumb, you have to repass
          name: this.state.name,
          stop: this.state.stop,
          trips: this.state.trips,
          realtime: rtData
        })        
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
      trips: [],
      realtime: {}
    })
  }
  public render() {
    var bgImage = {'backgroundImage': 'url(/a/map/' + this.props.routeParams.station + ')'}
    var slug
    if (this.state.stop != '') {
      slug = 'Stop ' + this.state.stop + ' / ' + this.state.name
    }

    var time = new Date()

    // makes times like 4:9 -> 4:09
    var minutes = time.getMinutes().toString()
    if (time.getMinutes() < 10) {
      minutes = '0' + minutes.toString()
    }
    var timestring = <time><span>{time.getHours()}</span><span className="blink">:</span><span>{minutes}</span></time>

    return (
      <div>
        <header style={bgImage}>
          <div>
            <span className="icon">🚆</span>
            {timestring}
            <h1>{this.state.name}</h1>
            <h2>{slug}</h2>
          </div>
        </header>
        <ul>
          {this.state.trips.map((trip) => {
            return <TripItem 
              color="#27ae60"
              code={trip.route_short_name}
              time={trip.arrival_time_seconds}
              name={trip.trip_headsign}
              key={trip.trip_id}
              trip_id={trip.trip_id}
              stop_sequence={trip.stop_sequence}
              realtime={this.state.realtime[trip.trip_id]}
             />
          })}
        </ul>
      </div>
    )
  }
}
export default Station