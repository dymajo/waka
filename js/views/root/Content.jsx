import React from 'react'
import { View, Text } from 'react-native'
import PropTypes from 'prop-types'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'
import { t } from '../../stores/translationStore.js'
import Sidebar from './Sidebar.jsx'
import { vars } from '../../styles.js'

const { desktopThreshold } = vars

class RootContent extends React.Component {
  static propTypes = {
    pin: PropTypes.func,
  }

  state = {
    stations: null,
    currentCity: StationStore.currentCity,
    desktopLayout: window.innerWidth > desktopThreshold,
  }

  async componentDidMount() {
    await this.triggerUpdate()
    StationStore.bind('change', this.triggerUpdate)
    StationStore.bind('newcity', this.newcity)
  }

  componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
    StationStore.unbind('newcity', this.newcity)
  }

  triggerUpdate = async () => {
    const stations = await StationStore.getData()
    this.setState({
      stations,
    })
  }

  newcity = () => {
    this.setState({
      currentCity: StationStore.currentCity,
    })
  }

  triggerLayout = () => {
    const { desktopLayout } = this.state
    if (window.innerWidth > desktopThreshold && desktopLayout === false) {
      this.setState({
        desktopLayout: true,
      })
    } else if (
      window.innerWidth <= desktopThreshold &&
      desktopLayout === true
    ) {
      this.setState({
        desktopLayout: false,
      })
    }
  }

  reject(e) {
    if (UiStore.state.mapView) {
      e.preventDefault()
    }
  }

  toggleRegion() {
    UiStore.safePush('/region')
  }

  render() {
    const { desktopLayout, stations, currentCity } = this.state
    let twitterAcc
    if (currentCity.prefix === 'nz-akl') {
      twitterAcc = (
        <Sidebar
          type="url"
          url="https://twitter.com/AT_TravelAlerts"
          icon="at.svg"
          name="Auckland Transport"
          description={t('serviceAlerts.twitter', { account: 'AT_TravelAlerts' })}
        />
      )
    } else if (currentCity.prefix === 'nz-chc') {
      twitterAcc = (
        <Sidebar
          type="url"
          url="https://twitter.com/MetroCanterbury"
          icon="agencies/metro-canterbury.png"
          name="Metro"
          description={t('serviceAlerts.twitter', {
            account: 'MetroCanterbury',
          })}
        />
      )
    } else if (currentCity.prefix === 'nz-wlg') {
      twitterAcc = (
        <Sidebar
          type="url"
          url="https://twitter.com/metlinkwgtn"
          icon="metlink.svg"
          name="Metlink"
          description={t('serviceAlerts.twitter', { account: 'metlinkwgtn' })}
        />
      )
    }

    const secondTwo = [
      <Sidebar
        key="city"
        type="install"
        action={this.toggleRegion}
        icon="city.svg"
        name={t('onboarding.city.name')}
        description={t('onboarding.city.description')}
      />,
      <Sidebar
        key="feedback"
        url="/feedback"
        icon="patron.svg"
        name={t('onboarding.feedback.name')}
        description={t('onboarding.feedback.description')}
      />,
    ]
    if (!desktopLayout) {
      secondTwo.push(
        <Sidebar
          key="settings"
          url="/settings"
          icon="settings.svg"
          name={t('onboarding.settings.name')}
          description={t('onboarding.settings.description')}
        />
      )
    }
    const description2 = (
      <div>
        <h3>Why the name Waka?</h3>
        <p>
          The word waka in te reo Māori encompasses transport and vehicles, and
          we chose this name as a acknowledgment of our country, Aotearoa New
          Zealand.
        </p>
        <p>
          We acknowledge the tangata whenua and the ongoing struggles Māori have
          in actively participating in the Māori language and culture. We would
          like to do our bit to support Te Reo as an official language of
          Aotearoa, and provide improved access for Māori communities.
        </p>
        <p>Kia Ora.</p>
      </div>
    )
    const onboarding = (
      <div className="onboard blue-fill">
        <ul>
          <Sidebar
            type="description"
            name={t('onboarding.welcome.name', { appname: t('app.name') })}
            description={t('onboarding.welcome.description', {
              appname: t('app.name'),
            })}
            description2={description2}
          />
          {desktopLayout ? (
            <>
              <Sidebar
                url={`/l/${
                  currentCity.prefix === 'none'
                    ? 'nz-akl' // just go... somewhere
                    : this.state.currentCity.prefix
                }`}
                icon="lines.svg"
                action={this.toggleRegion}
                name={t('onboarding.lines.name')}
                description={t('onboarding.lines.description')}
              />
              {currentCity.prefix === 'nz-wlg' ? (
                <Sidebar
                  key="guidebook"
                  url={`/guide/${currentCity.prefix}`}
                  icon="guidebook.svg"
                  name={t('onboarding.guidebook.name')}
                  description={t('onboarding.guidebook.description', {
                    city: currentCity.name || 'your city',
                  })}
                />
              ) : null}
            </>
          ) : (
            <Sidebar
              type="install"
              action={this.props.togglePin}
              icon="pin.svg"
              name={t('onboarding.install.name')}
              description={t('onboarding.install.description', {
                appname: t('app.name'),
              })}
            />
          )}

          {secondTwo}
        </ul>
      </div>
    )

    let message
    if (StationStore.getOrder().length === 0) {
      message = (
        <h6>
          {t('savedStations.empty')}
          <br />
          {t('savedStations.empty2')}
        </h6>
      )
    }

    // positions the onboarding thing dependent on pwa mode.
    if (stations !== null) {
      return (
        <div className="root-card-content">
          <View onLayout={this.triggerLayout}>
            {onboarding}
            <h2>{t('savedStations.title')}</h2>
            {message}
            <ul>
              {StationStore.getOrder().map(station => {
                const url = station.split('|').slice(-1)
                return (
                  <Sidebar
                    key={station}
                    url={`/s/${StationStore.StationData[station].region ||
                      'nz-akl'}/${url}`}
                    name={stations[station].name}
                    icon={`${stations[station].icon}.svg`}
                    description={stations[station].description}
                  />
                )
              })}
            </ul>
            <h2>{t('serviceAlerts.title')}</h2>
            <ul>
              {twitterAcc}
              <Sidebar
                type="url"
                url="https://twitter.com/DYMAJOLtd"
                icon="dymajo.svg"
                name="DYMAJO"
                description={t('serviceAlerts.twitter', {
                  account: 'DYMAJOLtd',
                })}
              />
            </ul>
            <div className="more-section">
              <h2>{t('savedStations.more')}</h2>
              <ul className="blue-fill">{secondTwo}</ul>
            </div>
            <a
              className="label version"
              href="https://dymajo.com"
              target="_blank"
              rel="noopener"
              onClick={this.reject}
            >
              DYMAJO Waka v{localStorage.getItem('AppVersion')}
            </a>
          </View>
        </div>
      )
    }
    return null
  }
}

export default RootContent
