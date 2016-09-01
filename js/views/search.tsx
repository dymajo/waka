import * as React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
interface IAppProps extends React.Props<Search> {}

interface IAppState {
  station: string
}

class Search extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      station: ''
    }

    this.triggerChange = this.triggerChange.bind(this)
    this.triggerClick = this.triggerClick.bind(this)
  }
  private triggerChange(e) {
    this.setState({
      station: e.currentTarget.value
    })
  }
  private triggerClick() {
    //StationStore.addStop(this.state.station)]
    browserHistory.push(`/s/${this.state.station}`)
  }
  public render() {
    return (
      <div>Add station using this input thing<br />
        <input type="text" placeholder="station number" onChange={this.triggerChange} />
        <button onClick={this.triggerClick}>search</button>
      </div>
    )
  }
}
export default Search