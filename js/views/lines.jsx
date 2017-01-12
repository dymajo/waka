import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import { StationStore } from '../stores/stationStore'

class Lines extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      service: '',
      allLines: undefined,
      groups: []
    }
    this.triggerChange = this.triggerChange.bind(this)
  }
  
  viewLine(line){
    return function() {
      browserHistory.push(`/l/${line}`)
    }
  }
  triggerBack() {
    browserHistory.push('/')
  }

  triggerChange(e) {
    this.setState({
      service: e.currentTarget.value
    })
  }

  componentDidMount() {
    fetch('/a/lines').then((response)=>{
      response.json().then((data) => {
        this.setState({
          allLines: data.lines,
          groups: data.groups,
          operators: data.operators
        })       
      })
    })
  }

  render() {
    let ret
    // there needs to be a sorting function in here probably
    if (this.props.children === null) {
      ret = []
      this.state.groups.forEach((group) => {
        ret.push(<h2 key={group.name}>{group.name}</h2>)
        group.items.forEach((item, lineKey) => {
          let key = group.name + lineKey
          let el = this.state.allLines[item]
          let operator = this.state.operators[item]
          let name = el[0][0].replace(' Train Station', '')
          if (el[0].length > 1) {
            name = el[0][0].replace(' Train Station', '') + ' to ' + el[0][1].replace('Train Station', '')
          }
          ret.push(
            <div key={key}>
              <Link to={'/l/'+key}>
                <span className="line-pill" style={{backgroundColor: StationStore.getColor(operator, item)}}>{item}</span> {name}
              </Link>
            </div>
          )
        })
      })
      ret = <div className="list-lines">{ret}</div>
    } else {
      ret = this.props.children
    }
    return(
      <div className="lines-container">
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <h1>All Lines</h1>
          </div>
        </header>
        {ret}
      </div>
    )
  }
}

export default Lines