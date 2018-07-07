import React from 'react'
import PropTypes from 'prop-types'
import { Text, View, StyleSheet } from 'react-native'

import { vars } from '../../styles.js'
import { t } from '../../stores/translationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { LinkButton } from '../reusable/linkButton.jsx'
import { TouchableOpacity } from '../reusable/touchableOpacity.jsx'

export class LineStops extends React.PureComponent {
  static propTypes = {
    stops: PropTypes.array,
    color: PropTypes.string.isRequired,
    line: PropTypes.string,
    region: PropTypes.string,
  }
  triggerClick(stop_code, mode) {
    return () => {
      const baseUrl = `/s/${this.props.region}/${stop_code}`
      if (mode === 'timetable') {
        UiStore.safePush(`${baseUrl}/timetable/${this.props.line}-2`)
      } else {
        UiStore.safePush(baseUrl)
      }
    }
  }
  render() {
    const stopStyle = [styles.stop, { borderColor: this.props.color }]
    return (
      <View style={styles.wrapper}>
        {this.props.stops.map((stop, index) => {
          return (
            <View style={stopStyle} key={stop.stop_sequence}>
              {index === 0 ? (
                <View style={styles.bulletWrapper}>
                  <View style={styles.bulletFake} />
                  <View style={styles.bulletSpacing} />
                </View>
              ) : index === this.props.stops.length - 1 ? (
                <View style={styles.bulletWrapper}>
                  <View style={styles.bulletSpacing} />
                  <View style={styles.bulletFake} />
                </View>
              ) : null}
              <View style={styles.bullet} />
              <View
                style={
                  index === this.props.stops.length - 1
                    ? [styles.controls, { borderBottomWidth: 0 }]
                    : styles.controls
                }
              >
                <TouchableOpacity
                  iOSHacks={true}
                  style={styles.touchable}
                  onClick={this.triggerClick(stop.stop_id, 'services')}
                >
                  <Text style={styles.stopText}>{stop.stop_name}</Text>
                </TouchableOpacity>
                <LinkButton
                  onClick={this.triggerClick(stop.stop_id, 'timetable')}
                  color="secondary"
                  size="small"
                  label={t('vech_loc.timetable')}
                />
              </View>
            </View>
          )
        })}
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: vars.borderColor,
  },
  stop: {
    marginLeft: vars.padding,
    borderLeftWidth: 5,
    borderLeftStyle: 'solid',
    borderColor: '#666',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bulletWrapper: {
    flexDirection: 'column',
    marginLeft: -5,
  },
  bulletFake: {
    borderLeftWidth: 5,
    borderLeftStyle: 'solid',
    borderLeftColor: '#fff',
    flex: 1,
  },
  bullet: {
    borderTopWidth: 5,
    borderTopStyle: 'solid',
    borderTopColor: 'inherit',
    width: 10,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginRight: vars.padding * 0.75,
    marginLeft: -5,
  },
  bulletSpacing: {
    flex: 1,
  },
  controls: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: vars.borderColorWhite,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: vars.padding,
  },
  touchable: {
    flex: 1,
    paddingRight: vars.padding,
  },
  stopText: {
    flex: 1,
    fontSize: vars.defaultFontSize - 1,
    fontFamily: vars.defaultFontFamily,
    paddingTop: vars.padding * 0.75,
    paddingBottom: vars.padding * 0.75,
  },
})
