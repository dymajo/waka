import React from 'react'
import { browserHistory } from 'react-router'

class SearchSwitch extends React.Component {
  constructor(props) {
    super(props)
  }
  triggerLink(link) {
    return function() {
      browserHistory.push(link)
    }
  }
  render() {
    var ss = window.location.pathname.split('/')[1] === 's' ? 'selected' : ''
    var sl = window.location.pathname.split('/')[1] === 'l' ? 'selected' : ''
    return (
      <ul className="searchswitch">
        <li className={ss} onTouchTap={this.triggerLink('/s')}>Map</li>
        <li className={sl} onTouchTap={this.triggerLink('/l')}>Lines</li>
      </ul>
    )
  }
}
export default SearchSwitch