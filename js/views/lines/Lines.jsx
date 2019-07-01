import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'

import StationStore from '../../stores/StationStore'
import { t } from '../../stores/translationStore.js'
import LinkedScroll from '../reusable/LinkedScroll.jsx'

import Header from '../reusable/Header.jsx'

let styles

class Lines extends React.Component {
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
    icons: {},
    groupShow: {},
    friendlyNames: {},
  }

  triggerGroup = group => e => {
    e.preventDefault()
    const groupShow = JSON.parse(JSON.stringify(this.state.groupShow))
    if (groupShow[group] === 'show') {
      groupShow[group] = ''
    } else {
      groupShow[group] = 'show'
    }
    this.setState({
      groupShow,
    })
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
    const newPath = `/l/${StationStore.currentCity.prefix}`
    if (
      StationStore.currentCity.prefix !== 'none' &&
      window.location.pathname !== newPath
    ) {
      this.props.history.push(newPath)
    }
  }

  triggerGetLines = () => {
    this.setState({
      error: null,
    })
    this.getLines()
  }

  getLines = async () => {
    try {
      const data = await StationStore.getLines(this.props.match.params.region)
      const groupShow = {}
      data.groups.forEach(group => {
        groupShow[group.name] = ''
      })
      this.setState({
        meta: data.meta,
        allLines: data.lines,
        colors: data.colors,
        icons: data.icons,
        groups: data.groups,
        operators: data.operators,
        friendlyNames: data.friendlyNames,
        friendlyNumbers: data.friendlyNumbers,
        groupShow,
      })
    } catch (err) {
      this.setState({
        error: err,
      })
    }
  }

  disable(e) {
    e.preventDefault()
  }

  hijack = link => e => {
    e.preventDefault()
    this.props.history.push(link)
  }

  render() {
    let ret
    // there needs to be a sorting function in here probably
    if (this.state.groups !== null && this.state.error === null) {
      ret = []
      this.state.groups.forEach(group => {
        ret.push(<h2 key={group.name}>{group.name}</h2>)
        const innerLineList = group.items.map((item, lineKey) => {
          const key = group.name + lineKey
          const el = this.state.allLines[item]
          let name = el[0][0].replace(' Train Station', '')
          if (el[0].length > 1) {
            name = `${el[0][0].replace(
              ' Train Station',
              ''
            )} to ${el[0][1].replace('Train Station', '')}`
          }
          name = this.state.friendlyNames[item] || name

          let linePillInner
          if (this.state.icons.item !== undefined) {
            linePillInner = (
              <img
                className="line-pill-icon"
                src={`/route_icons/${this.state.icons[item]}-color.svg`}
              />
            )
          } else {
            linePillInner = (
              <span
                className="line-pill"
                style={{
                  backgroundColor: this.state.colors[item] || '#000',
                }}
              >
                {this.state.friendlyNumbers[item] || item}
              </span>
            )
          }

          return (
            <li key={key}>
              <TouchableOpacity
                onClick={this.hijack(
                  `/l/${this.props.match.params.region}/${item}`
                )}
              >
                <div className="line-item">
                  <span className="line-pill-wrapper">{linePillInner}</span>
                  <span className="line-label">{name}</span>
                </div>
              </TouchableOpacity>
            </li>
          )
        })
        const needsLabel = group.items.length > 3
        if (needsLabel) {
          let label = group.items.length - 3
          if (this.state.groupShow[group.name] === 'show') {
            label = `${t('lines.less', { number: label })} ▴`
          } else {
            label = `${t('lines.more', { number: label })} ▾`
          }
          innerLineList.push(
            <li
              className="line-item expand"
              key={`${group.name}expand`}
              onClick={this.triggerGroup(group.name)}
            >
              {label}
            </li>
          )
        }
        const key = `${group.name}innerLines`
        const className = `inner-lines ${this.state.groupShow[group.name]}`
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
styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})

export default withRouter(Lines)
