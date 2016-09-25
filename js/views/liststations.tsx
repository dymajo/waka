import * as React from 'react'
import { iOS } from '../models/ios.ts'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

declare function require(name: string): any;
let request = require('reqwest')

interface IListStationsProps extends React.Props<ListStations>{
  routeParams?: {
    line: string
  }
}

interface IListStationsState {
  back: boolean
}

class ListStations extends React.Component<IListStationsProps, IListStationsState>{
  constructor(props){
    super(props)
    this.state = {
      back: false
    }
    this.triggerBack = this.triggerBack.bind(this)

    UiStore.bind('goingBack', this.triggerBack)
  }

  private componentWillUnmount() {
    UiStore.unbind('goingBack', this.triggerBack)
  }

  public triggerBack() {
    this.setState({
      back: UiStore.getState().goingBack
    })
  }
  
  public render() {
    var className = 'listStations'
    if (!this.props.children) {
      className += ' activepane'
    }
    var cfclassName = 'cfContainer'
    if (this.state.back) {
      if (window.location.pathname === '/cf') {
        cfclassName += ' goingbacklocal'
      } else {
        cfclassName += ' goingback'
      }  
    }
    return(
      <div className={cfclassName}>
        <div className={className}>
          <div className="listStationsBackground"></div>
          <h1>Congestion Free Network</h1>
          <StationItem icon="x" active={this.props.routeParams.line}
            name="Northern Express" color="#0056a9" stations={[
            { name: 'Britomart', id: '234'},
            { name: 'Sturdee Street', id: '293'},
            { name: 'Fanshawe Street', id: '290'},
            { name: 'Victoria Park', id: '2920'},
            { name: '', id: 'szone', zone: true},
            { name: 'Akoranga Station', id: '23x4'},
            { name: 'Smales Farm Station', id: '230'},
            { name: 'Sunnynook Station', id: '232x'},
            { name: 'Constellation Park & Ride', id: '130', zone: true},
            { name: 'Albany Park & Ride', id: '13x'},
            { name: '', id: 'hzone', zone: true},
            { name: 'Hibiscus Coast Station', id: '13'}
          ]} />
          <StationItem icon="f" active={this.props.routeParams.line}
            name="Ferries" color="#000" stations={[
              {name: 'Downtown Pier 1', id: '9600'},
              {name: 'Downtown Pier 1A', id: '9604'},
              {name: 'Downtown Pier 2', id: '9610'},
              {name: 'Downtown Pier 3', id: '9620'},
              // don't think this pier is used?
              //{name: 'Downtown Pier 3D', id: '9623'},
              {name: 'Downtown Pier 4', id: '9630'},
              {name: 'Beach Haven', id: '9650'},
              {name: 'Bayswater', id: '9640'},
              {name: 'Birkenhead', id: '9660'},
              {name: 'Devonport', id: '9670'},
              {name: 'Gulf Harbour', id: '9690'},
              {name: 'Half Moon Bay', id: '9700'},
              {name: 'Hobsonville', id: '9720'},
              {name: 'Northcote Point', id: '9730'},
              {name: 'Pine Harbour', id: '9740'},
              {name: 'Rangitoto', id: '9760'},
              {name: 'Stanley Point', id: '9770'},
              {name: 'Waiheke', id: '9790'},
              {name: 'West Harbour', id: '9810'}
            ]} />
          <StationItem icon="e" active={this.props.routeParams.line}
            name="Eastern Line" color="#fec132" stations={[
            {name: 'Britomart', id: '0133'},
            { name: '', id: 'izone', zone: true},
            {name: 'Orakei', id: '0116'},
            {name: 'Meadowbank', id: '0117'},
            {name: 'Glen Innes', id: '0103'},
            {name: 'Panmure', id: '0130'},
            {name: 'Sylvia Park', id: '0244'},
            {name: 'Westfield', id: '0111'},
            {name: 'Otahuhu', id: '0101', zone: true},
            {name: 'Middlemore', id: '0109'},
            {name: 'Papatoetoe', id: '0100'},
            {name: 'Puhinui', id: '0108'},
            {name: 'Manukau', id: '9218'}
          ]} />
          <StationItem icon="o" active={this.props.routeParams.line}
            name="Onehunga Line" color="#21b4e3" stations={[
            {name: 'Britomart', id: '0133'},
            {name: 'Newmarket', id: '0115', zone: true},
            {name: 'Remuera', id: '0114'},
            {name: 'Ellerslie', id: '0113'},
            {name: 'Greenlane', id: '0112'},
            {name: 'Penrose', id: '0102'},
            {name: 'Te Papapa', id: '0606'},
            {name: 'Onehunga ✈', id: '0605'}
          ]} />
          <StationItem icon="s" active={this.props.routeParams.line}
            name="Southern Line" color="#e52f2b" stations={[
            {name: 'Britomart', id: '0133'},
            {name: 'Newmarket', id: '0115', zone: true},
            {name: 'Remuera', id: '0114'},
            {name: 'Greenlane', id: '0113'},
            {name: 'Ellerslie', id: '0112'},
            {name: 'Penrose', id: '0102'},
            {name: 'Westfield', id: '0111'},
            {name: 'Otahuhu', id: '0101', zone: true},
            {name: 'Middlemore', id: '0109'},
            {name: 'Papatoetoe ✈', id: '0100'},
            {name: 'Puhinui', id: '0108', zone: true},
            {name: 'Homai', id: '0099'},
            {name: 'Manurewa', id: '0098'},          
            {name: 'Te Mahia', id: '0107'},
            {name: 'Takanini', id: '0106'},
            {name: 'Papakura', id: '0097'},
            { name: '', id: 'pzone', zone: true},
            {name: 'Pukekohe', id: '0134'}
          ]} />
          <StationItem icon="w" active={this.props.routeParams.line}
            name="Western Line" color="#4f9734" stations={[
            {name: 'Britomart', id: '0133'},
            {name: 'Newmarket', id: '0115'},
            {name: 'Grafton', id: '0277'},
            {name: 'Mt Eden ✈', id: '0118'},
            {name: 'Kingsland', id: '0122', zone: true},
            {name: 'Morningside', id: '0104'},
            {name: 'Baldwin Avenue', id: '0119'},
            {name: 'Mt Albert', id: '0120'},
            {name: 'Avondale', id: '0105'},
            {name: 'New Lynn', id: '0129', zone: true},
            {name: 'Fruitvale Road', id: '0123'},
            {name: 'Glen Eden', id: '0124'},
            {name: 'Sunnyvale', id: '0121'},
            {name: 'Henderson', id: '0125'},
            {name: 'Sturges Road', id: '0126'},
            {name: 'Ranui', id: '0128'},
            {name: 'Swanson', id: '0127'}
          ]} />
        </div>
        <div className="listStationsContainer">
          {this.props.children}
        </div>
      </div>
    )
  }
}

interface Station {
  name: string,
  id: string,
  zone?: boolean
}
interface IStationItemProps extends React.Props<StationItem> {
  name: string,
  color: string,
  stations: Array<Station>,
  active: string,
  icon: string
}

class StationItem extends React.Component<IStationItemProps, {}> {
  constructor(props) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
    this.triggerItemClick = this.triggerItemClick.bind(this)
  }
  public triggerClick() {
    browserHistory.push(`/cf/${this.props.icon}`)
  }
  public triggerItemClick(id) {
    var icon = this.props.icon
    return function(e) {
      if (icon === 'x') {
        return console.log('please fix issue #15 first')
      }
      browserHistory.push(`/cf/${icon}/${id}`)
    }
  }
  public triggerBack() {
    UiStore.navigateSavedStations('/cf')
  }
  public render() {
    var className
    if (this.props.active === this.props.icon) {
      className = 'selected'
    }
    var triggerClick = this.triggerItemClick
    return (
      <div className={className}>
        <h2 onTouchTap={this.triggerClick}>
          <div className="icon" style={{backgroundColor: this.props.color}}>{this.props.icon}</div>
          {this.props.name}</h2>
        <div className="linewrap">
          <h2>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <div className="icon" style={{backgroundColor: this.props.color}}>{this.props.icon}</div>
            {this.props.name}
          </h2>
          <ul className="enable-scrolling" onTouchStart={iOS.triggerStart}>
            <div className="scrollwrap" style={{borderColor: this.props.color}}>
            {this.props.stations.map(function(item) {
              var zone
              if (item.zone) {
                zone = <span>Z</span>
              }
              var className
              if (item.name === '') {
                className = 'zoneonly'
              }
              return <li onTouchTap={triggerClick(item.id)} key={item.id} className={className}>{item.name}{zone}</li>
            })}
            </div>
          </ul>
        </div>
      </div>
    )
  }
}

export default ListStations