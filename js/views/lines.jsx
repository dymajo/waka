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

    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchMove = this.triggerTouchMove.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)
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

    if (iOS.detect() && window.navigator.standalone === true) {
      this.refs.container.addEventListener('touchstart', this.triggerTouchStart)
      this.refs.container.addEventListener('touchmove', this.triggerTouchMove)
      this.refs.container.addEventListener('touchend', this.triggerTouchEnd)
      this.refs.container.addEventListener('touchcancel', this.triggerTouchEnd)
    }
  }
  componentWillUnmount() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.refs.container.removeEventListener('touchstart', this.triggerTouchStart)
      this.refs.container.removeEventListener('touchmove', this.triggerTouchMove)
      this.refs.container.removeEventListener('touchend', this.triggerTouchEnd)
      this.refs.container.removeEventListener('touchcancel', this.triggerTouchEnd)
    }
  }

  triggerTouchStart(event) {
    if (this.props.children !== null) {
      this.touchStartPos = 100
      return
    }
    // This is a hack to detect flicks  
    this.longTouch = false
    setTimeout(() => {
      this.longTouch = true
    }, 250)

    this.touchStartPos = event.touches[0].pageX
  }
  triggerTouchMove(event) {
    if (this.touchStartPos <= 7) {
      this.newPos = Math.max(event.touches[0].pageX - this.touchStartPos, 0)
      this.refs.container.setAttribute('style', 'transform: translate3d('+this.newPos+'px,0,0);')
    }
  }
  triggerTouchEnd(event) {
    if (this.touchStartPos <= 7) {
      this.touchStartPos = 100
      let swipedAway = false
      if (this.newPos > window.innerWidth/2 || this.longTouch === false) {
        // rejects touches that don't really move
        if (this.newPos > 3) {
          swipedAway = true
        }
      }
      if (swipedAway) {
        // navigate backwards with no animate flag
        UiStore.navigateSavedStations('/', true)
        this.refs.container.setAttribute('style', 'transform: translate3d(100vw,0,0);transition: transform 0.3s ease-out;')
      } else {
        this.refs.container.setAttribute('style', 'transform: translate3d(0px,0,0);transition: transform 0.3s ease-out;')
      }
    }
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
      <div className={className} ref="container">
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