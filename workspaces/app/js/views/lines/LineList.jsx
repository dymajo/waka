import React, { Fragment } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { withRouter } from 'react-router-dom'

import { vars } from '../../styles.js'
import LineData from '../../data/LineData.js'
import { t } from '../../stores/translationStore.js'

import Header from '../reusable/Header.jsx'
import LinkButton from '../reusable/LinkButton.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import Spinner from '../reusable/Spinner.jsx'

let styles

class LineList extends React.Component {
  state = {
    loading: true,
    meta: {},
    error: null,
    groups: [],
    icons: {},
    groupShow: {},
  }

  lineData = new LineData({})

  componentDidMount() {
    window.addEventListener('online', this.triggerGetLines)
    this.getLines()
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.triggerGetLines)
  }

  triggerGroup = group => e => {
    e.preventDefault()
    let { groupShow } = this.state
    groupShow = JSON.parse(JSON.stringify(groupShow))
    if (groupShow[group] === 'show') {
      groupShow[group] = ''
    } else {
      groupShow[group] = 'show'
    }
    this.setState({
      groupShow,
    })
  }

  triggerGetLines = () => {
    this.setState({
      error: null,
      loading: true,
    })
    this.getLines()
  }

  getLines = async () => {
    const { match } = this.props
    const { lineData } = this
    try {
      lineData.region = match.params.region
      const data = await lineData.getLines()

      const groupShow = {}
      data.groups.forEach(group => {
        groupShow[group.name] = ''
      })
      const { meta, icons, groups } = data

      this.setState({
        meta,
        icons,
        groups,
        groupShow,
        loading: false,
      })
    } catch (err) {
      this.setState({
        error: err.message,
        loading: false,
      })
    }
  }

  hijack = link => e => {
    const { history, match } = this.props
    e.preventDefault()
    const joined = [
      '',
      'l',
      match.params.region,
      link.agencyId,
      link.routeShortName,
    ].join('/')
    let query = ''
    if (link.routeId && link.directionId) {
      query = `?route_id=${link.routeId}&direction=${link.directionId}`
    } else if (link.routeId && !link.directionId) {
      query = `?route_id=${link.routeId}`
    } else if (!link.routeId && link.directionId) {
      query = `?direction=${link.directionId}`
    }
    const url = `${joined}${query}`
    history.push(url)
  }

  render() {
    const { loading, error, groups, icons, meta, groupShow } = this.state
    return (
      <View style={styles.wrapper}>
        <Header title={t('lines.title')} subtitle={meta.longName || ''} />
        <LinkedScroll>
          {loading ? <Spinner /> : null}
          {error !== null ? (
            <View style={styles.errorWrapper}>
              <Text style={styles.error}>{error}</Text>
              <LinkButton
                onClick={this.triggerGetLines}
                label={t('app.errorRetry')}
              />
            </View>
          ) : (
            groups.map(group => (
              <Fragment key={group.name}>
                <Text style={styles.header}>{group.name}</Text>
                {(groupShow[group.name] === 'show'
                  ? group.items
                  : group.items.slice(0, 3)
                ).map((item, lineKey) => (
                  <TouchableOpacity
                    key={group.name + lineKey}
                    onClick={this.hijack(item)}
                    style={styles.row}
                  >
                    <Text style={styles.label}>{item.routeLongName}</Text>
                    <View>
                      {icons[`${item.agencyId}/${item.routeShortName}`] ===
                      undefined ? (
                        <Text
                          style={[
                            styles.pill,
                            {
                              backgroundColor: item.routeColor,
                            },
                          ]}
                        >
                          {item.routeShortName}
                        </Text>
                      ) : (
                        <img
                          alt={item.routeLongName}
                          style={{ maxHeight: '28px', width: 'auto' }}
                          src={`/route_icons/${
                            icons[`${item.agencyId}/${item.routeShortName}`]
                          }-color.svg`}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                {group.items.length > 3 ? (
                  <TouchableOpacity onClick={this.triggerGroup(group.name)}>
                    <Text style={[styles.label, styles.expandText]}>
                      {groupShow[group.name] === 'show'
                        ? `${t('lines.less', {
                            number: group.items.length - 3,
                          })} ▴`
                        : `${t('lines.more', {
                            number: group.items.length - 3,
                          })} ▾`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </Fragment>
            ))
          )}
          <View style={styles.linesInner} />
        </LinkedScroll>
      </View>
    )
  }
}
const {
  padding,
  fontFamily,
  defaultFontSize,
  smallFontSize,
  headerColor,
} = vars
styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  linesInner: {
    paddingBottom: vars.padding * 2,
  },
  errorWrapper: { padding },
  error: {
    fontSize: defaultFontSize,
    fontFamily,
    textAlign: 'center',
    marginBottom: padding,
  },
  header: {
    fontSize: smallFontSize + 1,
    fontFamily,
    fontWeight: 'bold',
    color: headerColor,
    textTransform: 'uppercase',
    paddingTop: padding * 1.5,
    paddingLeft: padding,
    paddingRight: padding,
    paddingBottom: padding * 0.5,
    borderBottomColor: vars.borderColor,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
  },
  image: {
    maxHeight: 28,
    height: '100%',
    width: 50,
    alignItems: 'end',
    justifyContent: 'end',
  },
  row: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: vars.borderColor,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    paddingRight: padding * 0.75,
  },
  pill: {
    fontFamily,
    fontWeight: '600',
    fontSize: defaultFontSize,
    color: '#fff',
    paddingLeft: padding * 0.25,
    paddingRight: padding * 0.25,
    paddingTop: padding * 0.125,
    paddingBottom: padding * 0.125,
    borderRadius: '2px',
    minWidth: padding * 1.75,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    fontSize: defaultFontSize,
    fontFamily,
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding / 2,
    paddingBottom: padding / 2,
  },
  expandText: {
    color: vars.headerIconColor,
    fontWeight: '600',
  },
})

export default withRouter(LineList)
