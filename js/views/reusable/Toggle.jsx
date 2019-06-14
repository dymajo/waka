import React from 'react'
import PropTypes from 'prop-types'
import SettingsStore from '../../stores/SettingsStore.js'
import { t } from '../../stores/translationStore.js'

class Toggle extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    id: PropTypes.string,
  }

  state = {
    checked: SettingsStore.getState()[this.props.id],
  }

  triggerChange = () => {
    SettingsStore.toggle(this.props.id)
  }

  render() {
    return (
      <div className="settingwrap">
        <h3>{this.props.children}</h3>
        <input
          onChange={this.triggerChange}
          defaultChecked={this.state.checked}
          id={this.props.id}
          type="checkbox"
          className="tgl tgl-flat"
        />
        <label htmlFor={this.props.id} className="tgl-btn" />
        <span className="tgl-lbl">
          <span>{t('settings.preferences.disabled')}</span>
          <span>{t('settings.preferences.enabled')}</span>
        </span>
      </div>
    )
  }
}

export default Toggle
