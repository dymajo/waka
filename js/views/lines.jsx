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
      friendlyNames: {},
      runAnimation: false
    }
    this.triggerChange = this.triggerChange.bind(this)
    this.triggerGroup = this.triggerGroup.bind(this)

    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchMove = this.triggerTouchMove.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)
    this.goingBack = this.goingBack.bind(this)
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
      if (groupShow[group] === 'show') {
        groupShow[group] = ''
      } else {
        groupShow[group] = 'show'
      }
      this.setState({
        groupShow: groupShow
      })
    }
  }
  componentWillMount() {
    this.setState({
      runAnimation: true
    })
    setTimeout(() => {
      this.setState({
        runAnimation: false
      })
    }, UiStore.animationTiming)
  }
  componentDidUpdate() {
    if (this.props.children === null) {
      document.title = 'Lines - Transit'
    }
  }

  componentDidMount() {
    if (this.props.children === null) {
      document.title = 'Lines - Transit'
    }
    fetch('/a/nz-akl/lines').then((response)=>{
      response.json().then((data) => {
        let groupShow = {}
        data.groups.forEach(function(group) {
          groupShow[group.name] = ''
        })
        this.setState({
          allLines: data.lines,
          groups: data.groups,
          operators: data.operators,
          friendlyNames: data.friendlyNames,
          groupShow: groupShow
        })       
      })
    })

    if (iOS.detect() && window.navigator.standalone === true) {
      this.refs.container.addEventListener('touchstart', this.triggerTouchStart)
      this.refs.container.addEventListener('touchmove', this.triggerTouchMove)
      this.refs.container.addEventListener('touchend', this.triggerTouchEnd)
      this.refs.container.addEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.bind('goingBack', this.goingBack)
  }
  componentWillUnmount() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.refs.container.removeEventListener('touchstart', this.triggerTouchStart)
      this.refs.container.removeEventListener('touchmove', this.triggerTouchMove)
      this.refs.container.removeEventListener('touchend', this.triggerTouchEnd)
      this.refs.container.removeEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.unbind('goingBack', this.goingBack)
  }
  goingBack() {
    if (UiStore.state.goingBack && this.props.children === null) {
      this.setState({
        goingBack: true
      })
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
      event.preventDefault()
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
  disable(e) {
    e.preventDefault()
  }
  hijack(link) {
    return function() {
      browserHistory.push(link)
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
          name = this.state.friendlyNames[item] || name

          let roundelStyle = 'line-pill'
          let code = item
          if (item === 'WEST' || item === 'EAST' || item === 'ONE' || item === 'STH' || item === 'NEX' || item === 'PUK') {
            roundelStyle += ' cf'
            code = item[0]
            if (item === 'PUK') {
              code = 'S'
            }
          }
          return (
            <a className="line-item" key={key} href={'/l/'+item} onClick={this.disable} onTouchTap={this.hijack('/l/'+item)}>
              <span className="line-pill-wrapper">
                <span className={roundelStyle} style={{backgroundColor: StationStore.getColor(operator, item)}}>{code}</span>
              </span>
              <span className="line-label">{name}</span>
            </a>
          )
        })
        let label = group.items.length - 3 
        if (this.state.groupShow[group.name] === 'show') {
          label += ' less ▴'
        } else {
          label += ' more ▾'
        }
        innerLineList.push(
          <div className="line-item expand" key={group.name + 'expand'} onTouchTap={this.triggerGroup(group.name)}>
            {label}
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
    }

    let styles = {}
    if (this.state.runAnimation && UiStore.getAnimationIn() && this.props.children === null) {
      styles.animation = UiStore.getAnimationIn()
    } else if (this.state.goingBack) {
      Object.assign(styles, UiStore.getAnimationOut())
    }

    return(
      <div>
        <div className={className} ref="container" style={styles}>
          <header className='material-header'>
            <div>
              <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
              <h1>All Lines</h1>
            </div>
          </header>
          {ret}
          {children}
        </div>
      </div>
    )
  }
}

export default Lines