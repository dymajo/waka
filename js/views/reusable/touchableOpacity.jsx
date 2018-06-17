import React from 'react'
import { View } from 'react-native-web'

export class TouchableOpacity extends React.Component {
  render() {
    // TODO: Dynamically choose which is the best property for iOS.
    const { children, className, ...other } = this.props
    const newClassName = (className || '') + ' touchable-opacity'
    return (
      <View className={newClassName} {...other}>
        {children}
      </View>
    )
  }
}
