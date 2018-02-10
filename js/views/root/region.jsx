import React from 'react'
import { t } from '../../stores/translationStore.js'
import { CurrentLocation } from '../../stores/currentLocation.js'
import PropTypes from 'prop-types'

import Header from '../header.jsx'

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
  render() {
    let dev = null
    if (process.env.NODE_ENV !== 'production') {
      dev = [
        <li key="nz-dun" className="nz-dun" onTouchTap={this.changeCity('nz-dun')}>
          <h2>{t('regions.nz-dun-long').split(',')[0]}</h2>
          <h1>{t('regions.nz-dun-long').split(',')[1]}</h1>
        </li>,
        <li key="au-syd" className="au-syd" onTouchTap={this.changeCity('au-syd')}>
          <h2>{t('regions.au-syd-long').split(',')[0]}</h2>
          <h1>{t('regions.au-syd-long').split(',')[1]}</h1>
        </li>
      ]
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
            <li className="nz-akl" onTouchTap={this.changeCity('nz-akl')}>
              <h2>{t('regions.nz-akl-long').split(',')[0]}</h2>
              <h1>{t('regions.nz-akl-long').split(',')[1]}</h1>
            </li>
            <li className="nz-wlg" onTouchTap={this.changeCity('nz-wlg')}>
              <h2>{t('regions.nz-wlg-long').split(',')[0]}</h2>
              <h1>{t('regions.nz-wlg-long').split(',')[1]}</h1>
            </li>
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
