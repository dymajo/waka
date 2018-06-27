import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { t } from '../../stores/translationStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'

import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'

class SaveWithoutRouter extends React.Component {
  constructor(props) {
    super(props)
    if (
      UiStore.state.lastTransition !== 'backward' &&
      UiStore.state.cardPosition === 'map'
    ) {
      requestAnimationFrame(() => {
        UiStore.setCardPosition('default')
      })
    }
    StationStore.getData(
      this.props.match.params.station,
      this.props.match.params.region
    ).then(data => {
      this.setState({
        name: data.name || data.stop_name || '',
      })
    })
  }
  state = {
    name: '',
    checked: this.props.match.params.station
      .split('+')
      .reduce((result, item) => {
        result[this.props.match.params.region + '|' + item] = true
        return result
      }, {}),
  }
  static propTypes = {
    history: PropTypes.object,
    match: PropTypes.object,
  }
  triggerCheckbox = item => {
    return e => {
      const checked = JSON.parse(JSON.stringify(this.state.checked))
      checked[item] = e.currentTarget.checked
      this.setState({
        checked: checked,
      })
    }
  }
  triggerSaveAdd = () => {
    const stations = []
    const otherwise = []
    Object.entries(this.state.checked).forEach(item => {
      if (item[1] === true) stations.push(item[0].split('|').slice(-1)[0])
      if (item[1] === false) otherwise.push(item[0].split('|').slice(-1)[0])
    })

    const newId = stations.join('+')
    StationStore.removeStop(
      this.props.match.params.region + '|' + this.props.match.params.station
    )
    stations.forEach(station =>
      StationStore.removeStop(this.props.match.params.region + '|' + station)
    )
    otherwise.forEach(station =>
      StationStore.addStop(station, null, this.props.match.params.region)
    )
    StationStore.addStop(newId, this.state.name, this.props.match.params.region)

    UiStore.goBack('/')
    if (newId !== this.props.match.params.station && newId !== '') {
      const url = `/s/${this.props.match.params.region}/${newId}`

      // needs to be on a timeout
      const history = this.props.history
      setTimeout(() => {
        history.replace(url)
      })
    }
  }
  triggerSaveChange = e => {
    this.setState({
      name: e.currentTarget.value,
    })
  }
  triggerRemove = () => {
    StationStore.removeStop(
      this.props.match.params.region + '|' + this.props.match.params.station
    )
    UiStore.goBack('/')
  }
  render() {
    const region = this.props.match.params.region
    const stop = this.props.match.params.station
    const regionStop = region + '|' + stop

    const mergers = Object.keys(this.state.checked)
    StationStore.getOrder(region).forEach(item => {
      if (
        item !== stop &&
        mergers.indexOf(item) === -1 &&
        item.split('+').length === 1
      ) {
        mergers.push(item)
      }
    })
    mergers.sort()

    let combined
    let removeBtn
    let header = t('stationedit.title2')
    if (StationStore.getOrder().indexOf(regionStop) > -1) {
      header = t('stationedit.title')
      if (this.props.match.params.station.split('+').length === 1) {
        removeBtn = (
          <button className="inline" onClick={this.triggerRemove}>
            Remove Stop
          </button>
        )
      }
    }

    if (mergers.length > 1) {
      combined = (
        <div>
          <h3>{t('stationedit.merge')}</h3>
          <ul>
            {mergers.filter(i => i !== regionStop).map(item => {
              return (
                <li key={item}>
                  <input
                    id={'merge-' + item}
                    onChange={this.triggerCheckbox(item)}
                    type="checkbox"
                    checked={this.state.checked[item] || false}
                  />
                  <label htmlFor={'merge-' + item}>
                    {item.split('|').slice(-1)[0]} -{' '}
                    {(StationStore.StationData[item] || {}).name}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )
    }

    return (
      <View style={styles.wrapper}>
        <Header title={header} />
        <LinkedScroll>
          <View>
            <h3>{t('stationedit.name')}</h3>
            <input
              type="text"
              value={this.state.name}
              onChange={this.triggerSaveChange}
              ref={e => (this.saveInput = e)}
            />
            {combined}
            {removeBtn}
            <button className="submit" onClick={this.triggerSaveAdd}>
              {t('stationedit.confirm')}
            </button>
          </View>
        </LinkedScroll>
      </View>
    )
  }
}
const Save = withRouter(SaveWithoutRouter)
export { Save }

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})
