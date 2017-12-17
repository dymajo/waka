import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { StationStore } from '../../stores/stationStore.js'
import { t } from '../../stores/translationStore.js'

import StationIcon from '../../../dist/icons/station.svg'
import SettingsIcon from '../../../dist/icons/settings.svg'

import RegionPopover from './region.jsx'

class RootHeader extends React.Component {
  static propTypes = {
    history: PropTypes.object,
  }
  state = {
    currentCity: StationStore.currentCity,
  }
  componentDidMount() {
    StationStore.bind('newcity', this.newcity)
  }
  componentWillUnmount() {
    StationStore.unbind('newcity', this.newcity)
  }
  triggerSettings = () => {
    if (window.location.pathname === '/settings') {
      this.props.history.push('/')
    } else {
      this.props.history.push('/settings')
    }
  }
  newcity = () => {
    this.setState({
      currentCity: StationStore.currentCity,
    })
  }
  render() {
    let secondHeading = t('regions.pick')
    if (this.state.currentCity !== 'none') {
      secondHeading = t('regions.' + this.state.currentCity + '-long')
    }

    return [
      <header key="header" className="material-header branding-header">
        <span className="header-left">
          <StationIcon />
        </span>
        <div className="header-expand menu" onTouchTap={this.props.toggleRegion}>
          <h1>
            <strong>{t('app.name')}</strong>
          </h1>
          <h2>{secondHeading} <small>▼</small></h2>
        </div>
        <span className="header-right" onTouchTap={this.triggerSettings}>
          <SettingsIcon />
        </span>
      </header>,
      <RegionPopover
        key="popover"
        visible={this.props.region}
        toggle={this.props.toggleRegion}
      />,
    ]
  }
}
const RootHeaderWithRouter = withRouter(RootHeader)
export default RootHeaderWithRouter
