import React from 'react'
import { View, StyleSheet } from 'react-native'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'

import { StationStore } from '../../stores/stationStore'
import { UiStore } from '../../stores/uiStore'
import { t } from '../../stores/translationStore.js'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'

import { Header } from '../reusable/header.jsx'
import { TouchableOpacity } from '../reusable/touchableOpacity.jsx'

class LinesView extends React.Component {
  static propTypes = {
    history: PropTypes.object,
    match: PropTypes.object,
  }
  state = {
    meta: {},
    error: null,
    allLines: undefined,
    groups: null,
    colors: {},
    groupShow: {},
    friendlyNames: {},
  }

  triggerGroup = group => {
    return e => {
      e.preventDefault()
      let groupShow = JSON.parse(JSON.stringify(this.state.groupShow))
      if (groupShow[group] === 'show') {
        groupShow[group] = ''
      } else {
        groupShow[group] = 'show'
      }
      this.setState({
        groupShow: groupShow,
      })
    }
  }
  componentDidMount() {
    window.addEventListener('online', this.triggerGetLines)
    StationStore.bind('newcity', this.newcity)

    this.getLines()
  }
  componentWillUnmount() {
    window.removeEventListener('online', this.triggerGetLines)
    StationStore.unbind('newcity', this.newcity)
  }
  newcity = () => {
    if (StationStore.currentCity !== 'none') {
      this.props.history.push('/l/' + StationStore.currentCity)
    }
  }
  triggerGetLines = () => {
    this.setState({
      error: null,
    })
    this.getLines()
  }

  getLines = () => {
    StationStore.getLines(this.props.match.params.region)
      .then(data => {
        let groupShow = {}
        data.groups.forEach(function(group) {
          groupShow[group.name] = ''
        })
        this.setState({
          meta: data.meta,
          allLines: data.lines,
          colors: data.colors,
          groups: data.groups,
          operators: data.operators,
          friendlyNames: data.friendlyNames,
          friendlyNumbers: data.friendlyNumbers,
          groupShow: groupShow,
        })
      })
      .catch(err => {
        this.setState({
          error: err,
        })
      })
  }

  disable(e) {
    e.preventDefault()
  }
  hijack = link => {
    return e => {
      e.preventDefault()
      this.props.history.push(link)
    }
  }

  render() {
    let ret
    // there needs to be a sorting function in here probably
    if (this.state.groups !== null && this.state.error === null) {
      ret = []
      this.state.groups.forEach(group => {
        ret.push(<h2 key={group.name}>{group.name}</h2>)
        let innerLineList = group.items.map((item, lineKey) => {
          let key = group.name + lineKey
          let el = this.state.allLines[item]
          let name = el[0][0].replace(' Train Station', '')
          if (el[0].length > 1) {
            name =
              el[0][0].replace(' Train Station', '') +
              ' to ' +
              el[0][1].replace('Train Station', '')
          }
          name = this.state.friendlyNames[item] || name

          let roundelStyle = 'line-pill'
          let code = this.state.friendlyNumbers[item] || item
          if (
            item === 'WEST' ||
            item === 'EAST' ||
            item === 'ONE' ||
            item === 'STH' ||
            item === 'NEX' ||
            item === 'PUK'
          ) {
            roundelStyle += ' cf'
            code = item[0]
            if (item === 'PUK') {
              code = 'S'
            }
          }
          return (
            <li key={key}>
              <TouchableOpacity
                iOSHacks={true}
                className="line-item"
                onClick={this.hijack(
                  `/l/${this.props.match.params.region}/${item}`
                )}
              >
                <span className="line-pill-wrapper">
                  <span
                    className={roundelStyle}
                    style={{
                      backgroundColor: this.state.colors[item] || '#000',
                    }}
                  >
                    {code}
                  </span>
                </span>
                <span className="line-label">{name}</span>
              </TouchableOpacity>
            </li>
          )
        })
        let label = group.items.length - 3
        if (this.state.groupShow[group.name] === 'show') {
          label = t('lines.less', { number: label }) + ' ▴'
        } else {
          label = t('lines.more', { number: label }) + ' ▾'
        }
        innerLineList.push(
          <li
            className="line-item expand"
            key={group.name + 'expand'}
            onClick={this.triggerGroup(group.name)}
          >
            {label}
          </li>
        )
        let key = group.name + 'innerLines'
        let className = 'inner-lines ' + this.state.groupShow[group.name]
        ret.push(
          <ul className={className} key={key}>
            {innerLineList}
          </ul>
        )
      })
    } else if (this.state.error !== null) {
      ret = (
        <div className="error">
          <p>{this.state.error}</p>
          <button
            className="nice-button primary"
            onClick={this.triggerGetLines}
          >
            {t('app.errorRetry')}
          </button>
        </div>
      )
    } else if (
      window.defaultContent[1] &&
      window.location.pathname === window.defaultContent[0]
    ) {
      let domElem = document.createElement('div')
      domElem.innerHTML = window.defaultContent[1]
      let dangerous = { __html: domElem.querySelector('.scrollwrap').innerHTML }
      ret = <div dangerouslySetInnerHTML={dangerous} />
    } else {
      ret = <div className="spinner" />
    }

    return (
      <View style={styles.wrapper}>
        <Header
          title={t('lines.title')}
          subtitle={this.state.meta.longName || ''}
        />
        <LinkedScroll>
          <div className="list-lines">{ret}</div>
        </LinkedScroll>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})
const Lines = withRouter(LinesView)
export { Lines }
