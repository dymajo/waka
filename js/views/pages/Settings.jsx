import React from 'react'
import { View, StyleSheet } from 'react-native'

import { vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'

import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import Toggle from '../reusable/Toggle.jsx'

import ClockIcon from '../../../dist/icons/clock.svg'
import LongnamesIcon from '../../../dist/icons/longnames.svg'
import FeedbackIcon from '../../../dist/icons/feedback.svg'
import CreditsIcon from '../../../dist/icons/credits.svg'

const authors = [
  ['https://jono.nz', 'Jono Cooper', 'Design, Code'],
  ['http://mattdavidson.kiwi', 'Matt Davidson', 'Code, Photography - Sydney'],
  ['https://github.com/darth10', 'Akhil Wali', 'Database Optimization'],
  ['https://twitter.com/itemic', 'Terran Kroft', 'Testing, Feedback'],
  ['https://github.com/dwragge', 'Dylan Wragge', 'Testing, Feedback'],
  ['http://www.generationzero.org/', 'Generation Zero', 'Artwork'],
  ['https://twitter.com/pcman2000', 'Edward Zhang', 'Photography - Auckland'],
  [
    'http://www.jeffsmithphotography.co.nz/',
    'Jeff Smith',
    'Photography - Wellington',
  ],
]
const apis = [
  ['https://at.govt.nz', 'Auckland Transport', 'API Usage'],
  ['https://github.com', 'GitHub', 'Project Hosting'],
  ['https://www.openstreetmap.org/', 'OpenStreetMap', 'Map Data'],
  ['https://www.openmaptiles.com/', 'OpenMapTiles', 'Map Data'],
  ['https://material.io/icons/', 'Material Design', 'Icons'],
]

class Settings extends React.Component {
  state = {
    credits: false,
    animation: 'unmounted',
  }

  triggerCredits = () => {
    this.setState({
      credits: true,
    })
  }

  renderLinks(items) {
    return (
      <ul>
        {items.map((item, key) => (
          <li key={key}>
            <a target="_blank" rel="noopener noreferrer" href={item[0]}>
              {item[1]}
            </a>{' '}
            &ndash; {item[2]}
          </li>
        ))}
      </ul>
    )
  }

  render() {
    let button
    let className = 'creditscontainer'
    if (this.state.credits) {
      className += ' visible'
    } else {
      button = (
        <button onClick={this.triggerCredits}>
          <CreditsIcon />
          {t('settings.more.credits')}
        </button>
      )
    }

    return (
      <View style={styles.wrapper}>
        <Header title={t('settings.title')} />
        <LinkedScroll>
          <div className="settings">
            <div className="logobox">
              <div className="logo" id="logo">
                <span className="company">Dymajo </span>
                <span className="app">{t('app.name')} </span>
                <span className="version">
                  v{localStorage.getItem('AppVersion')}
                </span>
              </div>
              <div className="copyright">
                <a
                  className="subtle"
                  rel="noopener noreferrer"
                  href="https://dymajo.com"
                  target="_blank"
                >
                  &copy; 2016 - 2018 DYMAJO LTD
                </a>
              </div>
              <div className="sourcecode">
                {t('settings.license')}
                <br />
                {t('settings.contributions')}
                <br />
                <a
                  href="https://github.com/dymajo/waka"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  github.com/dymajo/waka
                </a>
              </div>
            </div>
            <div className="container">
              <h1>{t('settings.preferences.title')}</h1>
              <Toggle id="clock">
                <ClockIcon />
                {t('settings.preferences.hrs')}
              </Toggle>
              <Toggle id="longName">
                <LongnamesIcon />
                {t('settings.preferences.longnames')}
              </Toggle>
              <h1>{t('settings.more.title')}</h1>
              <div className="credits">
                <a className="button" href="mailto:hello@dymajo.com">
                  <FeedbackIcon />
                  {t('settings.more.feedback')}
                </a>
                {button}
                <div className={className}>
                  <p>
                    A number of people helped design, develop, and influence
                    Waka.
                  </p>
                  {this.renderLinks(authors)}
                  <h3>Special Thanks</h3>
                  <p>These are great things that are free, and we love them.</p>
                  {this.renderLinks(apis)}
                  <div className="love">Made with 💚 in Aotearoa, NZ</div>
                </div>
              </div>
            </div>
            <br />
            <br />
          </div>
        </LinkedScroll>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})

export default Settings
