import * as React from 'react'
import * as ReactDOM from 'react-dom'

interface IToggleProps extends React.Props<Toggle> {
    value: string,
    id: string
}


class Toggle extends React.Component<IToggleProps, {}> {
  constructor(props) {
    super(props)
    this.triggerChange = this.triggerChange.bind(this)
  }
  triggerChange() {
    //var checked = ReactDOM.findDOMNode(this.refs.checked).checked
    //console.log("checked: ", checked)
    console.log("checked")
  }
  render() {
    return (
      <div className="settingwrap">
        <h3>{this.props.children}</h3>
        <input
          onChange={this.triggerChange}
          defaultChecked={this.props.value}
          id={this.props.id}
          type="checkbox"
          ref="checked"
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