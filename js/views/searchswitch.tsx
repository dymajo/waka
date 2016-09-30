import * as React from 'react'
import { browserHistory } from 'react-router'

interface ISearchSwitchProps extends React.Props<SearchSwitch> {

}

class SearchSwitch extends React.Component<ISearchSwitchProps, {}> {
  constructor(props) {
    super(props)
  }
  public triggerLink(link) {
    return function() {
      browserHistory.push(link)
    }
  }
  public render() {
    var ss = window.location.pathname.split('/')[1] === 's' ? 'selected' : ''
    var sl = window.location.pathname.split('/')[1] === 'l' ? 'selected' : ''
    var scf = window.location.pathname.split('/')[1] === 'cf' ? 'selected' : ''
    return (
      <ul className="searchswitch">
        <li className={ss} onTouchTap={this.triggerLink('/s')}>Map</li>
        <li className={sl} onTouchTap={this.triggerLink('/l')}>Lines</li>
        <li className={scf} onTouchTap={this.triggerLink('/cf')}>Congestion<br />Free Network</li>
      </ul>
    )
  }
}
export default SearchSwitch