import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore'
import { UiStore } from '../stores/uiStore.js'

class Lines extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      service: '',
      allLines: undefined,
      groups: null,
      groupShow: {},
      animationFinished: false
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
    UiStore.navigateSavedStations('/')
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
    setTimeout(() => {
      this.setState({
        animationFinished: true
      })
    }, 275)
  }

  render() {
    let ret, children
    let className = 'lines-container'
    // there needs to be a sorting function in here probably
    if (this.state.groups !== null) {
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
    } else {
      ret = <div className="spinner" />
    }
    ret = (
      <div className="list-lines enable-scrolling" onTouchStart={iOS.triggerStart}>
        <div className="scrollwrap">{ret}</div>
      </div>
    )

    if (this.props.children !== null) {
      children = this.props.children && React.cloneElement(this.props.children, {
        operators: this.state.operators
      })
    } else if (this.state.animationFinished) {
      className += ' level-1'
    }
    return(
      <div className={className}>
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <h1>All Lines</h1>
          </div>
        </header>
        {ret}
        {children}
      </div>
    )
  }
}

export default Lines