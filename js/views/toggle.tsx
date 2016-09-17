import * as React from 'react'
import { SettingsStore } from '../stores/settingsStore.ts'

interface IToggleProps extends React.Props<Toggle> {
  id: string
}
interface IAppState {
  checked: boolean
}

class Toggle extends React.Component<IToggleProps, IAppState> {
  constructor(props) {
    super(props)
    this.triggerChange = this.triggerChange.bind(this)

    this.state = {
      checked: SettingsStore.getState()[this.props.id]
    }
  }
  triggerChange() {
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
        <label htmlFor={this.props.id} className="tgl-btn"></label>
        <span className="tgl-lbl">
          <span>Off</span>
          <span>On</span>
        </span>
      </div>
    )
  }
}

export default Toggle