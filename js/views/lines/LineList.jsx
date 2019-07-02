import React, { Fragment } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { withRouter } from 'react-router-dom'

import { vars } from '../../styles.js'
import StationStore from '../../stores/StationStore'
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
    lines: undefined,
    groups: [],
    colors: {},
    icons: {},
    groupShow: {},
    friendlyNames: {},
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

  newcity = () => {
    const { history } = this.props
    const newPath = `/l/${StationStore.currentCity.prefix}`
    if (
      StationStore.currentCity.prefix !== 'none' &&
      window.location.pathname !== newPath
    ) {
      history.push(newPath)
    }
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
    try {
      const data = await StationStore.getLines(match.params.region)

      const groupShow = {}
      data.groups.forEach(group => {
        groupShow[group.name] = ''
      })
      const {
        meta,
        lines,
        colors,
        icons,
        groups,
        operators,
        friendlyNames,
        friendlyNumbers,
      } = data

      this.setState({
        meta,
        lines,
        colors,
        icons,
        groups,
        operators,
        friendlyNames,
        friendlyNumbers,
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
    history.push(`/l/${match.params.region}/${link}`)
  }

  render() {
    const {
      loading,
      error,
      groups,
      icons,
      meta,
      lines,
      friendlyNames,
      friendlyNumbers,
      colors,
      groupShow,
    } = this.state
    return (
      <View style={styles.wrapper}>
        <Header title={t('lines.title')} subtitle={meta.longName || ''} />
        <LinkedScroll>
          {loading ? <Spinner /> : null}
          {error !== null ? (
            <View style={styles.errorWrapper}>
              <Text style={styles.error}>{error}</Text>
              <LinkButton
                onClick={this.triggerRetry}
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
                ).map((item, lineKey) => {
                  const el = lines[item]
                  const name =
                    friendlyNames[item] ||
                    (el[0].length === 1
                      ? el[0]
                      : [el[0][0], el[0][1]].join(' to '))

                  return (
                    <TouchableOpacity
                      key={group.name + lineKey}
                      onPress={this.hijack(item)}
                      style={styles.row}
                    >
                      <Text style={styles.label}>{name}</Text>
                      <View>
                        {icons[item] === undefined ? (
                          <Text
                            style={[
                              styles.pill,
                              {
                                backgroundColor: colors[item] || '#000',
                              },
                            ]}
                          >
                            {friendlyNumbers[item] || item}
                          </Text>
                        ) : (
                          <img
                            alt={friendlyNumbers[item] || item}
                            style={{ maxHeight: '28px', width: 'auto' }}
                            src={`/route_icons/${icons[item]}-color.svg`}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                })}
                {group.items.length > 3 ? (
                  <TouchableOpacity onPress={this.triggerGroup(group.name)}>
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
    whiteSpace: 'pre',
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
