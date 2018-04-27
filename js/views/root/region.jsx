import React from 'react'
import { t } from '../../stores/translationStore.js'
import { CurrentLocation } from '../../stores/currentLocation.js'
import PropTypes from 'prop-types'

import Header from '../header.jsx'

import { ImageBackground, View, Text, StyleSheet } from 'react-native-web'

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
  cityIcon = city => {
    return (
      <ImageBackground
        key={city}
        style={styles.region}
        onClick={this.changeCity(city)}
        source={{ uri: `/photos/${city}.jpg` }}
      >
        <Text style={[styles.regionText, styles.regionTextHeader]}>
          {t('regions.' + city + '-long').split(',')[0]}
        </Text>
        <Text style={[styles.regionText, styles.regionTextSubHeader]}>
          {t('regions.' + city + '-long').split(',')[1]}
        </Text>
      </ImageBackground>
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
          <View style={styles.voteText}>
            <Text style={styles.vote}>
              {t('regions.vote', { appname: t('app.name') })}
            </Text>
          </View>
          <div className="vote">
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

const styles = StyleSheet.create({
  vote: {
    fontSize: 15,
    textAlign: 'center',
  },
  voteText: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  region: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#333',
    // backgroundPosition: 50% 50%,
    // backgroundSize: cover,
    marginBottom: 10,
    borderRadius: 5,
    padding: 5,
    // textAlign: 'center',
    height: 125,
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.15)',
    // transition: 150ms transform ease-out,
    cursor: 'default',
  },
  regionText: {
    textAlign: 'center',
    position: 'relative',
    color: '#fff',
    lineHeight: 1,
    // textShadow: '0 1px 1px rgba(0, 0, 0, 0.5)',
    fontWeight: '600',
  },
  regionTextSubHeader: {
    paddingTop: 4,
    paddingBottom: 12,
    fontSize: 16,
  },
  regionTextHeader: {
    marginTop: 'auto',
    paddingBottom: 10,
    fontSize: 14,
  },
})
