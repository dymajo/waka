import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'

import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { LinkButton } from '../reusable/linkButton.jsx'

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
      }, 50)
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
        item.split('+').length === 1 &&
        !item.match('carpark') // this is a shit hack
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
          <LinkButton
            color="secondary"
            onClick={this.triggerRemove}
            label={t('stationedit.remove')}
          />
        )
      }
    }

    if (mergers.length > 1) {
      combined = (
        <React.Fragment>
          <Text style={styles.label}>
            {t('stationedit.merge').toUpperCase()}
          </Text>
          <View style={styles.checkboxContainer}>
            {mergers.filter(i => i !== regionStop).map(item => {
              return (
                <View
                  key={item}
                  style={styles.checkboxRow}
                  className="checkbox"
                >
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
                </View>
              )
            })}
          </View>
        </React.Fragment>
      )
    }

    return (
      <View style={styles.wrapper}>
        <Header title={header} />
        <LinkedScroll>
          <View style={styles.innerWrapper}>
            <Text style={styles.label}>
              {t('stationedit.name').toUpperCase()}
            </Text>
            <TextInput
              style={styles.input}
              value={this.state.name}
              onChange={this.triggerSaveChange}
            />
            {combined}
            {removeBtn}
            <LinkButton
              onClick={this.triggerSaveAdd}
              label={t('stationedit.confirm')}
            />
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
  innerWrapper: {
    padding: vars.padding,
  },
  label: {
    color: vars.headerColor,
    fontFamily: vars.fontFamily,
    fontWeight: 'bold',
    fontSize: vars.defaultFontSize - 2,
    paddingBottom: vars.padding * 0.25,
  },
  input: {
    fontFamily: vars.fontFamily,
    fontSize: vars.defaultFontSize,
    backgroundColor: '#fff',
    paddingTop: vars.padding * 0.5,
    paddingBottom: vars.padding * 0.5,
    paddingLeft: vars.padding * 0.75,
    paddingRight: vars.padding * 0.75,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: vars.borderColor,
    borderRadius: 3,
    marginBottom: vars.padding,
  },
  checkboxContainer: {
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
  },
  checkboxRow: {
    paddingBottom: vars.padding / 2,
  },
})
