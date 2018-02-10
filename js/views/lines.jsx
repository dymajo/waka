import React from 'react'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'
import BackGesture from './back-gesture.jsx'

import Header from './header.jsx'

const style = UiStore.getAnimation()

class Lines extends React.Component {
  static propTypes = {
    history: PropTypes.object,
    match: PropTypes.object
  }
  state = {
    error: null,
    allLines: undefined,
    groups: null,
    colors: {},
    groupShow: {},
    friendlyNames: {},
    animation: 'unmounted'
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
    document.title = t('lines.title') + ' - ' + t('regions.' + this.props.match.params.region) + ' - ' + t('app.name')
    this.gesture = new BackGesture({
      container: this.container,
      history: this.props.history,
    })
    this.gesture.bindEvents()

    window.addEventListener('online',  this.triggerGetLines)
    UiStore.bind('animation', this.animation)
    StationStore.bind('newcity', this.newcity)

    this.getLines()
  }
  componentWillUnmount() {
    this.gesture.unbindEvents()
    window.removeEventListener('online',  this.triggerGetLines)
    UiStore.unbind('animation', this.animation)
    StationStore.unbind('newcity', this.newcity)
  }
  newcity = () => { 
    if (StationStore.currentCity !== 'none') {
      this.props.history.push('/l/' + StationStore.currentCity)
    }
  }
  triggerGetLines = () => {
    this.setState({
      error: null
    })
    this.getLines()
  }

  getLines = () => {
    StationStore.getLines(this.props.match.params.region).then((data) => {
      let groupShow = {}
      data.groups.forEach(function(group) {
        groupShow[group.name] = ''
      })
      this.setState({
        allLines: data.lines,
        colors: data.colors,
        groups: data.groups,
        operators: data.operators,
        friendlyNames: data.friendlyNames,
        friendlyNumbers: data.friendlyNumbers,
        groupShow: groupShow
      })  
    }).catch((err) => {
      this.setState({
        error: err
      })
    })
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
    if (data[1] !== this.container || this.gesture.animationOverride === true) {
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
    let className = 'default-container'
    // there needs to be a sorting function in here probably
    if (this.state.groups !== null && this.state.error === null) {
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
          let code = this.state.friendlyNumbers[item] || item
          if (item === 'WEST' || item === 'EAST' || item === 'ONE' || item === 'STH' || item === 'NEX' || item === 'PUK') {
            roundelStyle += ' cf'
            code = item[0]
            if (item === 'PUK') {
              code = 'S'
            }
          }
          return (
            <li key={key}>
              <a className="line-item" href={`/l/${this.props.match.params.region}/${item}`} onClick={this.disable} onTouchTap={this.hijack(`/l/${this.props.match.params.region}/${item}`)}>
                <span className="line-pill-wrapper">
                  <span className={roundelStyle} style={{backgroundColor: this.state.colors[item] || '#000'}}>{code}</span>
                </span>
                <span className="line-label">{name}</span>
              </a>
            </li>
          )
        })
        let label = group.items.length - 3 
        if (this.state.groupShow[group.name] === 'show') {
          label = t('lines.less', {number: label}) + ' ▴'
        } else {
          label = t('lines.more', {number: label}) + ' ▾'
        }
        innerLineList.push(
          <li className="line-item expand" key={group.name + 'expand'} onTouchTap={this.triggerGroup(group.name)}>
            {label}
          </li>
        )
        let key = group.name + 'innerLines'
        let className = 'inner-lines ' + this.state.groupShow[group.name]
        ret.push(
          <ul className={className} key={key}>{innerLineList}</ul>
        )
      })
    } else if (this.state.error !== null) {
      ret = (
        <div className="error">
          <p>{this.state.error}</p>
          <button className="nice-button primary" onClick={this.triggerGetLines}>{t('app.errorRetry')}</button>
        </div>
      )
    } else if (window.defaultContent[1] && window.location.pathname === window.defaultContent[0]) {
      let domElem = document.createElement('div')
      domElem.innerHTML = window.defaultContent[1]
      let dangerous = {__html: domElem.querySelector('.scrollwrap').innerHTML}
      ret = (
        <div dangerouslySetInnerHTML={dangerous}></div>
      )
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
        <Header title={t('lines.title')} />
        {ret}
      </div>
    )
  }
}
const LinesWithRouter = withRouter(Lines)
export default LinesWithRouter