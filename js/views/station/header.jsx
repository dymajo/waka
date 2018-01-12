import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'

import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'

import SavedIcon from '../../../dist/icons/saved.svg'
import UnsavedIcon from '../../../dist/icons/unsaved.svg'
import BackIcon from '../../../dist/icons/back.svg'
import TrainIcon from '../../../dist/icons/train.svg'
import FerryIcon from '../../../dist/icons/ferry.svg'
import BusIcon from '../../../dist/icons/bus.svg'
import CableCarIcon from '../../../dist/icons/cablecar.svg'
import ParkingBuildingIcon from '../../../dist/icons/normal/parkingbuilding.svg'

const iconMap = {
  train: <TrainIcon />,
  ferry: <FerryIcon />,
  bus: <BusIcon />,
  cablecar: <CableCarIcon />,
  parkingbuilding: <ParkingBuildingIcon />,
}

class Header extends React.Component {
  constructor(props) {
    super(props)
    this.state.checked = this.props.match.params.station.split('+').reduce((result, item) => {
      result[this.props.match.params.region + '|' + item] = true
      return result
    }, {})
  }
  static propTypes = {
    name: PropTypes.string,
    description: PropTypes.string,
    fancy: PropTypes.bool,
    icon: PropTypes.string,
    history: PropTypes.object,
    match: PropTypes.object
  }
  state = {
    saveModal: null,
    name: '',
    checked: {}
  }
  componentWillReceiveProps(newProps) {
    this.setState({
      name: newProps.name
    })
  }
  getName(name) {
    name = name.replace(' Interchange', ' -')
    name = name.replace(' Bus Station', ' -')
    name = name.replace(' Train Station', '')
    name = name.replace(' Ferry Terminal', '')
    name = name.replace('- Cable Car Station', '')
    name = name.replace(' Station', '')
    return name
  }
  triggerBack = () => {
    UiStore.goBack(this.props.history, '/')
  }
  triggerCheckbox = item => {
    return e => {
      const checked = JSON.parse(JSON.stringify(this.state.checked))
      checked[item] = e.currentTarget.checked
      this.setState({
        checked: checked
      })
    }
  }
  triggerSave = () => {
    this.setState({
      saveModal: true
    })
  }
  triggerSaveAdd = () => {
    this.setState({
      saveModal: false
    })

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

    if (newId !== this.props.match.params.station && newId !== '') {
      this.props.history.replace(
        `/s/${this.props.match.params.region}/${newId}`
      )
    }
  }
  triggerSaveCancel = () => {
    this.setState({ saveModal: false })
  }
  triggerSaveChange = e => {
    this.setState({
      name: e.currentTarget.value
    })
  }
  triggerRemove = () => {
    StationStore.removeStop(
      this.props.match.params.region + '|' + this.props.match.params.station
    )
    this.setState({ saveModal: false })
  }
  render() {
    const region = this.props.match.params.region
    const stop = this.props.match.params.station
    const regionStop = region + '|' + stop

    let topIcon = (
      <span className="header-left" onTouchTap={this.triggerBack}>
        <BackIcon />
      </span>
    )

    let name = this.getName(this.state.name)
    let iconStr = this.props.description
    if (this.state.name !== '') {
      if (this.props.fancy) {
        topIcon = (
          <span className={'header-left mode ' + this.props.icon}>
            {iconMap[this.props.icon]}
          </span>
        )
      }

      if (this.props.icon === 'bus') {
        iconStr = t('station.bus') + ' ' + stop
      }
      if (this.props.match.params.station.split('+').length > 1) {
        name = this.state.name
        iconStr = t('savedStations.stops', {
          number: stop.split('+').join(', ')
        })
      }
    }

    let saveModal = 'modal-wrapper'
    if (this.state.saveModal === true) {
      saveModal += ' show'
    }

    let modalHeader, saveButton, combined, removeBtn
    if (StationStore.getOrder().indexOf(regionStop) === -1) {
      modalHeader = t('stationedit.title2')
      saveButton = (
        <span className="header-right save" onTouchTap={this.triggerSave}>
          <UnsavedIcon />
        </span>
      )
    } else {
      modalHeader = t('stationedit.title')
      saveButton = (
        <span className="header-right remove" onTouchTap={this.triggerSave}>
          <SavedIcon />
        </span>
      )

      if (this.props.match.params.station.split('+').length === 1) {
        removeBtn = (
          <button className="inline" onTouchTap={this.triggerRemove}>
            Remove Stop
          </button>
        )
      }
    }
    if (this.props.icon === 'parkingbuilding') {
      saveButton = null
    }

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

    return [
      <div key="modal" className={saveModal}>
        <div className="modal">
          <h2>{modalHeader}</h2>
          <div className="inner">
            <h3>{t('stationedit.name')}</h3>
            <input
              type="text"
              value={this.state.name}
              onChange={this.triggerSaveChange}
              ref={e => (this.saveInput = e)}
            />
            {combined}
            {removeBtn}
          </div>
          <button className="cancel" onTouchTap={this.triggerSaveCancel}>
            {t('stationedit.cancel')}
          </button>
          <button className="submit" onTouchTap={this.triggerSaveAdd}>
            {t('stationedit.confirm')}
          </button>
        </div>
      </div>,
      <header key="header" className="material-header">
        {topIcon}
        <div className="header-expand">
          <h1>{name}</h1>
          <h2>{iconStr}</h2>
        </div>
        {saveButton}
      </header>
    ]
  }
}
const HeaderWithRouter = withRouter(Header)
export default HeaderWithRouter
