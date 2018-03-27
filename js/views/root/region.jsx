import React from 'react'
import { t } from '../../stores/translationStore.js'
import { CurrentLocation } from '../../stores/currentLocation.js'
import PropTypes from 'prop-types'

import Header from '../header.jsx'

const devCities = ['nz-dud', 'nz-zqn', 'au-syd']
const liveCities = ['nz-akl', 'nz-wlg']

export default class RegionPopover extends React.Component {
  static propTypes = {
    toggle: PropTypes.func,
    visible: PropTypes.bool,
  }
  changeCity(city) {
    return () => {
      CurrentLocation.setCity(city)
      this.props.toggle()
    }
  }
  cityIcon = (city) => {
    return (
      <li key={city} className={city} onTouchTap={this.changeCity(city)}>
        <h2>{t('regions.' + city + '-long').split(',')[0]}</h2>
        <h1>{t('regions.' + city + '-long').split(',')[1]}</h1>
      </li>
    )
  }
  render() {
    const live = liveCities.map(this.cityIcon)
    let dev = null
    if (process.env.NODE_ENV !== 'production') {
      dev = devCities.map(this.cityIcon)
    }
    const className = 'region-popover ' + (this.props.visible ? 'show' : '')
    return (
      <div className={className}>
        <Header
          backFn={this.props.toggle}
          title={t('regions.pick')}
          className="no-shadow"
        />
        <div className="content">
          <ul>
            {live}
            {dev}
          </ul>
          <div className="vote">
            <p>{t('regions.vote', { appname: t('app.name') })}</p>
            <a
              className="nice-button primary small"
              href="https://twitter.com/dymajoltd"
              rel="noopener noreferrer"
              target="_blank"
            >
              {t('regions.activator')}
            </a>
          </div>
        </div>
      </div>
    )
  }
}
