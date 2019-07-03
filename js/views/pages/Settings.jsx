import React, { useState } from 'react'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'

import { paragraphStyles, vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'

import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import Toggle from '../reusable/Toggle.jsx'

import ClockIcon from '../../../dist/icons/clock.svg'
import LongnamesIcon from '../../../dist/icons/longnames.svg'
import FeedbackIcon from '../../../dist/icons/feedback.svg'
import CreditsIcon from '../../../dist/icons/credits.svg'

let styles

const renderLinks = items =>
  items.map((item, key) => (
    <View key={key} style={styles.creditRow}>
      <Text accessibilityRole="link" href={item[0]} style={styles.link}>
        {item[1]}
      </Text>
      <Text style={styles.linkDescription}>{item[2]}</Text>
    </View>
  ))

const Settings = () => {
  const [credits, setCredits] = useState(false)
  return (
    <View style={styles.wrapper}>
      <Header title={t('settings.title')} />
      <LinkedScroll>
        <View style={styles.logo}>
          <Text style={styles.company}>Dymajo </Text>
          <Text style={styles.app}>{t('app.name')} </Text>
          <Text style={styles.version}>
            v{localStorage.getItem('AppVersion')}
          </Text>
        </View>
        <Text
          accessibilityRole="link"
          href="https://dymajo.com"
          style={[paragraphStyles.p, { fontSize: vars.smallFontSize }]}
        >
          &copy; 2016 - 2019 DYMAJO LTD
        </Text>
        <Text style={paragraphStyles.p}>
          {t('settings.license')} {t('settings.contributions')}
        </Text>
        <Text
          style={[paragraphStyles.p, styles.link]}
          accessibilityRole="link"
          href="https://github.com/dymajo/waka"
        >
          github.com/dymajo/waka
        </Text>
        <Text style={paragraphStyles.h1}>
          {t('settings.preferences.title')}
        </Text>
        <Toggle id="clock">
          <ClockIcon />
          <Text style={styles.buttonText}>{t('settings.preferences.hrs')}</Text>
        </Toggle>
        <Toggle id="longName">
          <LongnamesIcon />
          <Text style={styles.buttonText}>
            {t('settings.preferences.longnames')}
          </Text>
        </Toggle>
        <Text style={paragraphStyles.h1}>{t('settings.more.title')}</Text>
        <TouchableOpacity>
          <View
            style={styles.button}
            accessibilityRole="link"
            href="https://twitter.com/dymajoltd"
          >
            <FeedbackIcon />
            <Text style={styles.buttonText}>{t('settings.more.feedback')}</Text>
          </View>
        </TouchableOpacity>
        {credits ? (
          <View>
            <Text style={paragraphStyles.p}>
              A number of people helped design, develop, and influence Waka.
            </Text>
            {renderLinks([
              ['https://jono.nz', 'Jono Cooper', 'Engineering'],
              ['http://mattdavidson.kiwi', 'Matt Davidson', 'Engineering'],
              ['http://www.generationzero.org/', 'Generation Zero', 'Artwork'],
            ])}
            {renderLinks([
              ['https://at.govt.nz', 'Auckland Transport', 'API Usage'],
              ['https://www.openstreetmap.org/', 'OpenStreetMap', 'Map Data'],
              ['https://www.openmaptiles.com/', 'OpenMapTiles', 'Map Data'],
            ])}
            <Text style={[paragraphStyles.p, styles.love]}>
              Made with 💚 in Aotearoa, NZ
            </Text>
          </View>
        ) : (
          <TouchableOpacity onClick={() => setCredits(true)}>
            <View style={styles.button}>
              <CreditsIcon />
              <Text style={styles.buttonText}>
                {t('settings.more.credits')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </LinkedScroll>
    </View>
  )
}
const {
  fontFamily,
  padding,
  accentColor,
  defaultFontSize,
  smallFontSize,
} = vars
styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  logo: {
    paddingTop: padding,
    paddingLeft: padding,
    paddingRight: padding,
    display: 'block',
  },
  company: {
    fontFamily,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 24,
  },
  app: {
    fontFamily,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  version: {
    fontFamily,
    fontSize: defaultFontSize,
    fontWeight: 'bold',
    color: accentColor,
  },
  button: {
    flexDirection: 'row',
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding * 0.5,
    paddingBottom: padding * 0.5,
  },
  buttonText: {
    fontFamily,
    fontSize: defaultFontSize,
    paddingLeft: padding * 0.5,
    flex: 1,
  },
  creditRow: {
    flex: 1,
    paddingLeft: padding,
    paddingRight: padding,
    paddingBottom: padding / 4,
  },
  link: {
    fontFamily,
    color: accentColor,
    fontWeight: 600,
  },
  linkDescription: { fontFamily },
  love: {
    fontWeight: 600,
    fontSize: smallFontSize,
  },
})

export default Settings
