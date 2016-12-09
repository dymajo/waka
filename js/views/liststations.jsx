import * as React from 'react'
import { iOS } from '../models/ios.js'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import SearchSwitch from './searchswitch.jsx'

class ListStations extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      back: false
    }
    this.triggerBack = this.triggerBack.bind(this)

    UiStore.bind('goingBack', this.triggerBack)
  }

  componentWillUnmount() {
    UiStore.unbind('goingBack', this.triggerBack)
  }

  triggerBack() {
    this.setState({
      back: UiStore.getState().goingBack
    })
  }
  triggerTab(page) {
    return function() {
      browserHistory.push(page)
    }
  }
  
  render() {
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
          <StationItem icon="n" active={this.props.routeParams.line}
            name="Northern Busway" stations={[
            { name: 'Britomart', id: '7071', interchange: 'feosw'},
            { name: 'Sturdee Street', id: '7034+7004'},
            { name: 'Victoria Park', id: '7036+1315'},
            { name: '', id: 'szone', zone: true},
            { name: 'Akoranga Station', id: '4063+4065+4083+4087+4085+4089'},
            { name: 'Smales Farm Station', id: '3355+3360+3362+3353'},
            { name: 'Sunnynook Station', id: '3221+3219+3238+3240'},
            { name: 'Constellation Park & Ride', id: '4222+4225+4223', zone: true},
            { name: 'Albany Park & Ride', id: '4227+4229+4226+4228'},
            { name: '', id: 'hzone', zone: true},
            { name: 'Hibiscus Coast Station', id: '4569'}
          ]} />
          <StationItem icon="f" active={this.props.routeParams.line}
            name="Ferries" stations={[
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
            name="Eastern Line" stations={[
            {name: 'Britomart', id: '0133', interchange: 'nfosw'},
            { name: '', id: 'izone', zone: true},
            {name: 'Orakei', id: '0116'},
            {name: 'Meadowbank', id: '0117'},
            {name: 'Glen Innes', id: '0103'},
            {name: 'Panmure', id: '0130'},
            {name: 'Sylvia Park', id: '0244'},
            {name: 'Westfield', id: '0111'},
            {name: 'Otahuhu', id: '0101', zone: true, interchange: 's'},
            {name: 'Middlemore', id: '0109'},
            {name: 'Papatoetoe ✈', id: '0100'},
            {name: 'Puhinui', id: '0108', interchange: 's'},
            {name: 'Manukau', id: '9218'}
          ]} />
          <StationItem icon="o" active={this.props.routeParams.line}
            name="Onehunga Line" stations={[
            {name: 'Britomart', id: '0133', interchange: 'nfesw'},
            {name: 'Newmarket', id: '0115', zone: true, interchange: 'sw'},
            {name: 'Remuera', id: '0114'},
            {name: 'Ellerslie', id: '0113'},
            {name: 'Greenlane', id: '0112'},
            {name: 'Penrose', id: '0102', interchange: 's'},
            {name: 'Te Papapa', id: '0606'},
            {name: 'Onehunga ✈', id: '0605'}
          ]} />
          <StationItem icon="s" active={this.props.routeParams.line}
            name="Southern Line" stations={[
            {name: 'Britomart', id: '0133', interchange: 'nfeow'},
            {name: 'Newmarket', id: '0115', zone: true, interchange: 'ow'},
            {name: 'Remuera', id: '0114'},
            {name: 'Greenlane', id: '0113'},
            {name: 'Ellerslie', id: '0112'},
            {name: 'Penrose', id: '0102', interchange: 'o'},
            {name: 'Westfield', id: '0111'},
            {name: 'Otahuhu', id: '0101', zone: true, interchange: 'e'},
            {name: 'Middlemore', id: '0109'},
            {name: 'Papatoetoe ✈', id: '0100'},
            {name: 'Puhinui', id: '0108', zone: true, interchange: 'e'},
            {name: 'Homai', id: '0099'},
            {name: 'Manurewa', id: '0098'},          
            {name: 'Te Mahia', id: '0107'},
            {name: 'Takanini', id: '0106'},
            {name: 'Papakura', id: '0097'},
            { name: '', id: 'pzone', zone: true},
            {name: 'Pukekohe', id: '0134'}
          ]} />
          <StationItem icon="w" active={this.props.routeParams.line}
            name="Western Line" stations={[
            {name: 'Britomart', id: '0133', interchange: 'nfeos'},
            {name: 'Newmarket', id: '0115', interchange: 'os'},
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
          <a href="http://www.congestionfree.co.nz/" target="_blank">What is the Congestion Free Network?</a>
        </div>
        <div className="listStationsContainer">
          {this.props.children}
        </div>
        <SearchSwitch />
      </div>
    )
  }
}

class StationItem extends React.Component {
  constructor(props) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
    this.triggerItemClick = this.triggerItemClick.bind(this)
  }
  triggerClick() {
    browserHistory.push(`/cf/${this.props.icon}`)
  }
  triggerItemClick(id) {
    var icon = this.props.icon
    return function(e) {
      browserHistory.push(`/cf/${icon}/${id}`)
    }
  }
  triggerBack() {
    UiStore.navigateSavedStations('/cf')
  }
  getColor(icon) {
    switch(icon) {
      case 'n':
        return '#0056a9'
      case 'e':
        return '#f39c12'
      case 'o':
        return '#21b4e3'
      case 's':
        return '#e52f2b'
      case 'w':
        return '#4f9734'
      default:
        return '#000'
    }
  }
  render() {
    var col = this.getColor
    var className
    if (this.props.active === this.props.icon) {
      className = 'selected'
    }
    var triggerClick = this.triggerItemClick
    return (
      <div className={className}>
        <h2 onTouchTap={this.triggerClick}>
          <div className="icon" style={{backgroundColor: col(this.props.icon)}}>{this.props.icon}</div>
          {this.props.name}</h2>
        <div className="linewrap">
          <h2>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <div className="icon" style={{backgroundColor: col(this.props.icon)}}>{this.props.icon}</div>
            {this.props.name}
          </h2>
          <ul className="enable-scrolling" onTouchStart={iOS.triggerStart}>
            <div className="scrollwrap" style={{borderColor: col(this.props.icon)}}>
            {this.props.stations.map(function(item) {
              var zone
              if (item.zone) {
                zone = <span className="zone">Z</span>
              }
              var className
              if (item.name === '') {
                className = 'zoneonly'
              }
              var interchange = []
              if (item.interchange) {
                item.interchange.split('').map(function(icon) {
                  var iclass = 'interchange'
                  // just a design thing
                  if (icon === 'f' || icon === 'n') {
                    iclass += ' pad'
                  }
                  interchange.push(
                    <span key={icon} style={{backgroundColor: col(icon)}} className={iclass}>
                      {icon}
                    </span>
                  )
                })
              }
              return (
                <li onTouchTap={triggerClick(item.id)}
                    key={item.id}
                    className={className}>
                    {item.name}
                    {interchange}{zone}
                </li>
              )
            })}
            </div>
          </ul>
        </div>
      </div>
    )
  }
}

export default ListStations