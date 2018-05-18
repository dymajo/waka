import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'

import { vars } from '../../styles.js'
import { UiStore } from '../../stores/uiStore.js'
import BackIcon from '../../../dist/icons/back.svg'
import CloseIcon from '../../../dist/icons/close.svg'

// not used for all headers yet...
class Header extends React.Component {
  static propTypes = {
    history: PropTypes.object,
    title: PropTypes.string,
    backFn: PropTypes.func,
  }
  triggerBack = () => {
    UiStore.goBack(this.props.history, '/')
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <View style={styles.pillWrapper}>
          <View style={styles.pill} />
        </View>
        <View style={styles.bottomWrapper}>
          <View style={styles.textWrapper}>
            <Text style={styles.text} numberOfLines={1}>
              {this.props.title}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.close}
            onPress={this.props.backFn || this.triggerBack}
          >
            <View style={styles.closeIcon}>
              <CloseIcon style={{ fill: vars.headerColor }} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
}
const paddingVertical = 12
const styles = StyleSheet.create({
  wrapper: {
    height: vars.headerHeight,
    backgroundColor: '#fff',
    paddingBottom: paddingVertical,
    touchAction: 'none',
  },
  pillWrapper: {
    height: paddingVertical,
    paddingTop: paddingVertical / 2,
  },
  pill: {
    backgroundColor: '#d8d8d8',
    width: 36,
    height: 5,
    borderRadius: 5,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  bottomWrapper: {
    display: 'flex',
    flexDirection: 'row',
  },
  textWrapper: {
    flex: 1,
    paddingLeft: vars.padding,
  },
  text: {
    fontFamily: vars.fontFamily,
    lineHeight: vars.headerHeight - paddingVertical * 2,
    color: vars.headerColor,
    fontSize: 18,
    fontWeight: '600',
  },
  close: {
    paddingLeft: vars.padding,
    paddingRight: vars.padding,
  },
  closeIcon: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
})
const HeaderWithRouter = withRouter(Header)
export default HeaderWithRouter
