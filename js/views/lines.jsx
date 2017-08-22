import React from 'react'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore'
import { UiStore } from '../stores/uiStore.js'

const style = UiStore.getAnimation()

class Lines extends React.Component {
  state = {
    allLines: undefined,
    groups: null,
    groupShow: {},
    friendlyNames: {},
    animation: 'unmounted'
  }

  static propTypes = {
    history: PropTypes.object
  }
  animationOverride = false

  triggerBack = () => {
    UiStore.goBack(this.props.history, '/')
  }

  triggerGroup = group => {
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
  componentDidMount() {
    document.title = 'Lines - Transit'

    StationStore.getLines().then((data) => {
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

    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.addEventListener('touchstart', this.triggerTouchStart)
      this.container.addEventListener('touchmove', this.triggerTouchMove)
      this.container.addEventListener('touchend', this.triggerTouchEnd)
      this.container.addEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.removeEventListener('touchstart', this.triggerTouchStart)
      this.container.removeEventListener('touchmove', this.triggerTouchMove)
      this.container.removeEventListener('touchend', this.triggerTouchEnd)
      this.container.removeEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.unbind('animation', this.animation)
  }

  triggerTouchStart = event => {
    // This is a hack to detect flicks  
    this.longTouch = false
    setTimeout(() => {
      this.longTouch = true
    }, 250)

    this.touchStartPos = event.touches[0].pageX
  }
  triggerTouchMove = event => {
    if (this.touchStartPos <= 7) {
      event.preventDefault()
      this.newPos = Math.max(event.touches[0].pageX - this.touchStartPos, 0)
      this.container.setAttribute('style', 'transform: translate3d('+this.newPos+'px,0,0);')
    }
  }
  triggerTouchEnd = () => {
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
        this.animationOverride = true
        UiStore.goBack(this.props.history, '/', true)
        this.container.setAttribute('style', 'transform: translate3d(100vw,0,0);transition: transform 0.3s ease-out;')
      } else {
        this.container.setAttribute('style', 'transform: translate3d(0px,0,0);transition: transform 0.3s ease-out;')
      }
    }
  }
  disable(e) {
    e.preventDefault()
  }
  hijack = link => {
    return () => {
      this.props.history.push(link)
    }
  }

  animation = (data) => {
    // ensures correct element
    if (data[1] !== this.container || this.animationOverride === true) {
      return
    // doesn't run if we're decending from down the tree up
    } else if (data[0] === 'exiting' && window.location.pathname !== '/') {
      return
    // doesn't run if we're decending further down the tree
    } else if (data[0] === 'entering' &&
        (UiStore.state.exiting.substring(0, window.location.pathname.length) === window.location.pathname &&
        window.location.pathname !== UiStore.state.exiting)) {
      return
    } else {
      this.setState({
        animation: data[0]
      })
    }
  }

  render() {
    let ret
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
            <a className="line-item" key={key} href={'/l/nz-akl/'+item} onClick={this.disable} onTouchTap={this.hijack('/l/nz-akl/'+item)}>
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

    return(
      <div className={className} ref={e => this.container = e} style={style[this.state.animation]}>
        <header className="material-header">
          <span className="header-left" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
          <div className="header-expand">
            <h1>All Lines</h1>
          </div>
        </header>
        {ret}
      </div>
    )
  }
}
const LinesWithRouter = withRouter(Lines)
export default LinesWithRouter