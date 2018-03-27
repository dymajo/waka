import React from 'react'
import { withRouter, Switch, Route } from 'react-router-dom'
import Station from '../station/index.jsx'

class Sign extends React.Component {
  componentDidMount() {
    console.log('sign mode - auto refresh in 10mins')
    setTimeout(() => window.location.reload(), 10 * 60 *1000)
  }
  render() {
    let containers = <Station />
    let marketingClassName = "marketing offset-left"
    if (this.props.match.params.station.split('+').length > 1) {
      marketingClassName = "marketing"
      containers = [
        <Station instance={0} key="container-0" />,
        <Station instance={1} key="container-1"/>
      ]
    }
    return (
      <div className="sign-container">
        {containers}
        <div className={marketingClassName}>
          <img src="/branding/launcher-icon-4x.png" />
          <br />
          <div className="brand">
            <h1>Waka</h1>
            <h2>getwaka.com</h2>
            <h3>github.com/consindo/waka</h3>
          </div>
        </div>
      </div>
    )
  }
}
const SignWithRouter = withRouter(Sign)
export default SignWithRouter