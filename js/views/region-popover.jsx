import React from 'react'
import { t } from '../stores/translationStore.js'
import { CurrentLocation } from '../stores/currentLocation.js'
import BackIcon from '../../dist/icons/back.svg'

export default class RegionPopover extends React.Component {
  changeCity(city) {
    return () => {
      CurrentLocation.setCity(city)
      this.props.toggle()
    }
  }
  render() {
    const className = 'region-popover ' + (this.props.visible ? 'show' : '')
    return (
      <div className={className}>
        <header className="material-header no-shadow">
          <span className="header-left" onTouchTap={this.props.toggle}><BackIcon /></span>
          <div className="header-expand">
            <h1 className="full-height">Pick City</h1>
          </div>
        </header>
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
          </ul>
          <div className="vote">
            <p>{t('regions.vote')}</p>
            <a className="nice-button primary small" href="https://twitter.com/dymajoltd" rel="noopener noreferrer" target="_blank">
              Let us know!
            </a>
          </div>
        </div>
      </div>
    )
  }
}