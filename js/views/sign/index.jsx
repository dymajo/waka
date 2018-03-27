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
    if (this.props.match.params.station.split('+').length > 1) {
      containers = [
        <Station instance={0} key="container-0" />,
        <Station instance={1} key="container-1"/>
      ]
    }
    return (
      <div className="sign-container">
        {containers}
      </div>
    )
  }
}
const SignWithRouter = withRouter(Sign)
export default SignWithRouter