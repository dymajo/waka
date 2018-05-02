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
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    height: vars.headerHeight,
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
  },
  textWrapper: {
    flex: 1,
    paddingLeft: vars.padding,
  },
  text: {
    lineHeight: vars.headerHeight,
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
