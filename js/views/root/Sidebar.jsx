import React from 'react'
import { TouchableOpacity } from 'react-native'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import UiStore from '../../stores/UiStore.js'
import { t } from '../../stores/translationStore'

import LinesIcon from '../../../dist/icons/lines.svg'
import PinIcon from '../../../dist/icons/pin.svg'
import MultiIcon from '../../../dist/icons/multi.svg'
import TrainIcon from '../../../dist/icons/train.svg'
import FerryIcon from '../../../dist/icons/ferry.svg'
import BusIcon from '../../../dist/icons/bus.svg'
import CablecarIcon from '../../../dist/icons/cablecar.svg'
import ATIcon from '../../../dist/icons/at.svg'
import MetlinkIcon from '../../../dist/icons/metlink.svg'
import DymajoIcon from '../../../dist/icons/dymajo.svg'
import PatronIcon from '../../../dist/icons/patron.svg'
import CityIcon from '../../../dist/icons/city.svg'
import SettingsIcon from '../../../dist/icons/settings.svg'

const iconMap = {
  'lines.svg': <LinesIcon />,
  'pin.svg': <PinIcon />,
  'multi.svg': <MultiIcon />,
  'train.svg': <TrainIcon />,
  'ferry.svg': <FerryIcon />,
  'cablecar.svg': <CablecarIcon />,
  'bus.svg': <BusIcon />,
  'at.svg': <ATIcon />,
  'metlink.svg': <MetlinkIcon />,
  'dymajo.svg': <DymajoIcon />,
  'patron.svg': <PatronIcon />,
  'city.svg': <CityIcon />,
  'settings.svg': <SettingsIcon />,
}

class Sidebar extends React.Component {
  state = {
    description: false,
  }

  static propTypes = {
    className: PropTypes.string,
    icon: PropTypes.string,
    type: PropTypes.string,
    action: PropTypes.func,
    url: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.node,
    description2: PropTypes.node,
    history: PropTypes.object,
  }

  getIcon(icon) {
    return iconMap[icon] || <img src={`/icons/normal/${icon}`} />
  }

  triggerTap = () => {
    if (this.props.type === 'install') {
      this.props.action()
    } else if (this.props.type === 'url') {
      window.open(this.props.url)
    } else {
      if (this.props.url === '/l/') {
        return this.props.action()
      }
      this.props.history.push(this.props.url)
    }
  }

  reject(e) {
    if (UiStore.state.mapView) {
      e.preventDefault()
    }
  }

  toggleDescription = () => {
    this.setState({
      description: !this.state.description,
    })
  }

  render() {
    const item = (
      <TouchableOpacity opacity={75} onClick={this.triggerTap}>
        <div className="touchable ss">
          <div className="icon">{this.getIcon(this.props.icon)}</div>
          <div className="text-wrapper">
            <h3 className="name">{this.props.name}</h3>
            <div className="description">{this.props.description}</div>
          </div>
        </div>
      </TouchableOpacity>
    )

    if (this.props.type === 'description') {
      let label = 'Read More'
      let className = 'description2'
      if (this.state.description) {
        className += ' show'
        label = 'Close'
      }
      return (
        <li className="ss text-only touchable">
          <div className="text-wrapper">
            <h1 className="name">{this.props.name}</h1>
            <div className="description">{this.props.description}</div>
            <div className={className}>{this.props.description2}</div>
            <button
              className="transparent-button"
              onClick={this.toggleDescription}
            >
              {label}
            </button>
          </div>
        </li>
      )
    }
    return item
  }
}
export default withRouter(Sidebar)
