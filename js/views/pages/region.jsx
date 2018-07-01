import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native-web'

import { TouchableOpacity } from '../reusable/touchableOpacity.jsx'
import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'
import { CurrentLocation } from '../../stores/currentLocation.js'

import { vars } from '../../styles.js'
import Header from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { LinkButton } from '../reusable/linkButton.jsx'

const devCities = ['nz-dud', 'nz-zqn', 'au-syd']
const liveCities = ['nz-akl', 'nz-wlg']

export class Region extends React.Component {
  changeCity(city) {
    return () => {
      CurrentLocation.setCity(city)
      UiStore.goBack('/')
    }
  }
  cityIcon = city => {
    return (
      <TouchableOpacity
        key={city}
        iOSHacks={true}
        activeOpacity={75}
        onClick={this.changeCity(city)}
        style={[styles.region, { backgroundImage: `url(/photos/${city}.jpg)` }]}
      >
        <Text style={[styles.regionText, styles.regionTextHeader]}>
          {t('regions.' + city + '-long').split(',')[0]}
        </Text>
        <Text style={[styles.regionText, styles.regionTextSubHeader]}>
          {t('regions.' + city + '-long').split(',')[1]}
        </Text>
      </TouchableOpacity>
    )
  }
  render() {
    const live = liveCities.map(this.cityIcon)
    let dev = null
    if (process.env.NODE_ENV !== 'production') {
      dev = devCities.map(this.cityIcon)
    }
    return (
      <View style={styles.wrapper}>
        <Header title={t('regions.pick')} />
        <LinkedScroll>
          <View style={styles.content}>
            {live}
            {dev}
            <View style={styles.voteWrapper}>
              <Text style={styles.vote}>
                {t('regions.vote', { appname: t('app.name') })}
              </Text>
              <LinkButton
                href="https://twitter.com/dymajoltd"
                label={t('regions.activator')}
              />
            </View>
          </View>
        </LinkedScroll>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingTop: vars.padding,
    paddingBottom: vars.padding,
    paddingLeft: vars.padding,
    paddingRight: vars.padding,
  },
  voteWrapper: {
    paddingTop: vars.padding,
    paddingBottom: vars.padding / 2,
  },
  vote: {
    fontSize: vars.defaultFontSize,
    fontFamily: vars.fontFamily,
    textAlign: 'center',
    marginBottom: vars.padding,
  },
  region: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#333',
    backgroundSize: '100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '50% 50%',
    overflow: 'hidden',
    marginBottom: 10,
    borderRadius: 5,
    padding: 5,
    height: 125,
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.15)',
    cursor: 'default',
  },
  regionText: {
    textAlign: 'center',
    position: 'relative',
    color: '#fff',
    lineHeight: 16,
    fontWeight: '600',
    fontFamily: vars.fontFamily,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  regionTextSubHeader: {
    paddingBottom: 5,
    fontSize: vars.defaultFontSize,
  },
  regionTextHeader: {
    marginTop: 'auto',
    fontSize: 14,
  },
})
