import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'

import LinesIcon from '../../dist/icons/lines.svg'
import PinIcon from '../../dist/icons/pin.svg'
import MultiIcon from '../../dist/icons/multi.svg'
import TrainIcon from '../../dist/icons/train.svg'
import FerryIcon from '../../dist/icons/ferry.svg'
import BusIcon from '../../dist/icons/bus.svg'
import ATIcon from '../../dist/icons/at.svg'
import MetlinkIcon from '../../dist/icons/metlink.svg'
import DymajoIcon from '../../dist/icons/dymajo.svg'
import PatronIcon from '../../dist/icons/patron.svg'
import CityIcon from '../../dist/icons/city.svg'

const iconMap = {
  'lines.svg': <LinesIcon />,
  'pin.svg': <PinIcon />,
  'multi.svg': <MultiIcon />,
  'train.svg': <TrainIcon />,
  'ferry.svg': <FerryIcon />,
  'bus.svg': <BusIcon />,
  'at.svg': <ATIcon />,
  'metlink.svg': <MetlinkIcon />,
  'dymajo.svg': <DymajoIcon />,
  'patron.svg': <PatronIcon />,
  'city.svg': <CityIcon />,
}

class SidebarItemVanilla extends React.Component {
  state = {
    description: false
  }
  static propTypes = {
    className: PropTypes.string,
    icon: PropTypes.string,
    type: PropTypes.string,
    action: PropTypes.func,
    url: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.node,
    description2: PropTypes.node,
    history: PropTypes.object
  }
  getIcon(icon) {
    return iconMap[icon] || <img src={`/icons/${icon}`} />
  }
  triggerTap = () => {
    if (this.props.type === 'install') {
      this.props.action()
    } else if (this.props.type !== 'url') {
      if (this.props.url === '/l/') {
        return this.props.action()
      }
      this.props.history.push(this.props.url)
    }
  }
  reject(e) {
    if (UiStore.state.mapView) {
      e.preventDefault()
    }
  }
  toggleDescription = () => {
    this.setState({
      description: !this.state.description
    })
  }
  render() {
    var classname = (this.props.className || '') + ' ss'
    if (window.location.pathname == this.props.url) {
      classname += ' selected'
    }
    let item = (
      <li className={classname} onTouchTap={this.triggerTap}>
        <div className="icon">
          {this.getIcon(this.props.icon)}
        </div>
        <div className="text-wrapper">
          <h3 className="name">{this.props.name}</h3>
          <div className="description">{this.props.description}</div>
        </div>
      </li>
    )
    if (this.props.type === 'url') {
      return (
        <a href={this.props.url} target="_blank" rel="noopener" onClick={this.reject}>
          {item}
        </a>
      )
    } else if (this.props.type === 'description') {
      let label = 'Read More'
      let className = 'description2'
      if (this.state.description) {
        className += ' show'
        label = 'Close'
      }
      return (
        <li className={classname + ' text-only'}>
          <div className="text-wrapper">
            <h1 className="name">{this.props.name}</h1>
            <div className="description">{this.props.description}</div>
            <div className={className}>{this.props.description2}</div>
            <button className="transparent-button" onClick={this.toggleDescription}>{label}</button>
          </div>
        </li>
      )
    }
    return item
  }
}
const SidebarItem = withRouter(SidebarItemVanilla)

class SavedSations extends React.Component {
  state = {
    stations: StationStore.getData(),
    currentCity: StationStore.currentCity,
  }
  triggerUpdate = () => {
    this.setState({
      stations: StationStore.getData()
    })
  }
  componentDidMount() {
    StationStore.bind('change', this.triggerUpdate)
    StationStore.bind('newcity', this.newcity)
  }
  componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
    StationStore.unbind('newcity', this.newcity)
  }
  newcity = () => {
    this.setState({
      currentCity: StationStore.currentCity
    })
  }
  reject(e) {
    if (UiStore.state.mapView) {
      e.preventDefault()
    }
  }
  render() {
    let twitterAcc
    if (this.state.currentCity === 'nz-akl') {
      twitterAcc = <SidebarItem
        type="url"
        url="https://twitter.com/AklTransport"
        icon="at.svg"
        name="Auckland Transport"
        description={t('serviceAlerts.twitter', {account: 'AklTransport'})}
      />
    } else if (this.state.currentCity === 'nz-wlg') {
      twitterAcc = <SidebarItem
        type="url"
        url="https://twitter.com/metlinkwgtn"
        icon="metlink.svg"
        name="Metlink"
        description={t('serviceAlerts.twitter', {account: 'metlinkwgtn'})}
      />
    }

    let stations = this.state.stations
    const secondTwo = [
      <SidebarItem
        key="city"
        type="install"
        action={this.props.toggleRegion}
        icon="city.svg"
        name={'Switch City'}
        description={'Get directions in another city.'}
      />,
      <SidebarItem
        key="sponsor"
        url="/sponsor"
        icon="patron.svg"
        name={t('onboarding.sponsor.name')}
        description={t('onboarding.sponsor.description', {appname: t('app.name')})}
      />
    ]
    const description2 = (
      <div>
        <h3>Why the name Waka?</h3>
        <p>The word waka in te reo Māori encompasses transport and vehicles, and we chose this name as a acknowledgment of our country, Aotearoa New Zealand.</p>
        <p>We acknowledge the tangata whenua and the ongoing struggles Māori have in actively participating in the Māori language and culture.
        We would like to do our bit to support Te Reo as an official language of Aotearoa, and provide improved access for Māori communities.</p>
        <p>Kia Ora.</p>
        <h3>What’s new in the latest version?</h3>
        <p>Version 2.0 is huge. We added full support for buses, trains, ferries, and the cable car in Te Whanganui-a-Tara, Wellington.</p>
        <p>We have a new map design, as well as a new app icon. We hope you like it!</p>
        <p>Waka is faster and more reliable than ever before, with new backend systems to encapsulate databases and processes.</p>
        <p>We hope you enjoy Waka 2.0!</p>
      </div>
    )
    const onboarding = <div className="onboard blue-fill">
      <ul>
        <SidebarItem
          type="description"
          name={t('onboarding.welcome.name', {appname: t('app.name')})}
          description={t('onboarding.welcome.description', {appname: t('app.name')})}
          description2={description2}
        />
        <SidebarItem
          url={'/l/' + (this.state.currentCity === 'none' ? '' : this.state.currentCity)}
          icon="lines.svg"
          action={this.props.toggleRegion}
          className="lines-btn"
          name={t('onboarding.lines.name')}
          description={t('onboarding.lines.description')}
        />
        <SidebarItem
          type="install"
          action={this.props.togglePin}
          icon="pin.svg"
          name={t('onboarding.install.name')}
          description={<div><span>{t('onboarding.install.description', {appname: t('app.name')})}</span><span>{t('onboarding.install.description2', {appname: t('app.name')})}</span></div>}
        />
        {secondTwo}
      </ul>
    </div>

    let message
    if (StationStore.getOrder().length === 0) {
      message = <h6>{t('savedStations.empty')}<br />{t('savedStations.empty2')}</h6>
    }

    // positions the onboarding thing dependent on pwa mode.
    return (
      <div className="root-card-content">
        {onboarding}
        <h2>{t('savedStations.title')}</h2>
        {message}
        <ul>
          {StationStore.getOrder().map((station) => {
            const url = station.split('|').slice(-1)
            return <SidebarItem
              key={station}
              url={`/s/${StationStore.StationData[station].region || 'nz-akl'}/${url}`}
              name={stations[station].name} 
              icon={stations[station].icon + '.svg'}
              description={stations[station].description} 
            />
          })}
        </ul>
        <h2>{t('serviceAlerts.title')}</h2>
        <ul>
          {twitterAcc}
          <SidebarItem
            type="url"
            url="https://twitter.com/DYMAJOLtd"
            icon="dymajo.svg"
            name="DYMAJO"
            description={t('serviceAlerts.twitter', {account: 'DYMAJOLtd'})}
          />
        </ul>
        <div className="more-section">
          <h2>{t('savedStations.more')}</h2>
          <ul className="blue-fill">{secondTwo}</ul>
        </div>
        <a className="label version" href="https://github.com/consindo/dymajo-transit" target="_blank" rel="noopener" onClick={this.reject}>
          DYMAJO Waka v{localStorage.getItem('AppVersion')}
        </a>
      </div>
    )
  }
}
export default SavedSations