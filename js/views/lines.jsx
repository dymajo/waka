import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import { StationStore } from '../stores/stationStore'

class Lines extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      service: '',
      allLines: undefined,
      groups: [],
      groupShow: {}
    }
    this.triggerChange = this.triggerChange.bind(this)
    this.triggerGroup = this.triggerGroup.bind(this)
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
  triggerGroup(group) {
    return (e) => {
      e.preventDefault()
      let groupShow = JSON.parse(JSON.stringify(this.state.groupShow))
      groupShow[group] = 'show'
      this.setState({
        groupShow: groupShow
      })
    }
  }

  componentDidMount() {
    fetch('/a/lines').then((response)=>{
      response.json().then((data) => {
        let groupShow = {}
        data.groups.forEach(function(group) {
          groupShow[group.name] = ''
        })
        this.setState({
          allLines: data.lines,
          groups: data.groups,
          operators: data.operators,
          groupShow: groupShow
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
        let innerLineList = group.items.map((item, lineKey) => {
          let key = group.name + lineKey
          let el = this.state.allLines[item]
          let operator = this.state.operators[item]
          let name = el[0][0].replace(' Train Station', '')
          if (el[0].length > 1) {
            name = el[0][0].replace(' Train Station', '') + ' to ' + el[0][1].replace('Train Station', '')
          }
          return (
            <Link className="line-item" key={key} to={'/l/'+item}>
              <span className="line-pill-wrapper">
                <span className="line-pill" style={{backgroundColor: StationStore.getColor(operator, item)}}>{item}</span>
              </span>
              <span className="line-label">{name}</span>
            </Link>
          )
        })
        innerLineList.push(
          <div className="line-item expand" key={group.name + 'expand'} onTouchTap={this.triggerGroup(group.name)}>
            {group.items.length - 4} more ▾
          </div>
        )
        let key = group.name + 'innerLines'
        let className = 'inner-lines ' + this.state.groupShow[group.name]
        ret.push(
          <div className={className} key={key}>{innerLineList}</div>
        )
      })
      ret = <div className="list-lines">{ret}</div>
    } else {
      ret = this.props.children && React.cloneElement(this.props.children, {
        operators: this.state.operators
      })
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