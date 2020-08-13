import React from 'react'
import { View, StyleSheet } from 'react-native'
import { vars } from '../../styles.js'
import SettingsStore from '../../stores/SettingsStore.js'
import { t } from '../../stores/translationStore.js'

let styles
const Toggle = ({ id, children }) => {
  return (
    <View style={styles.button}>
      {children}
      <div>
        <input
          onChange={() => SettingsStore.toggle(id)}
          defaultChecked={SettingsStore.getState()[id]}
          id={id}
          type="checkbox"
          className="tgl tgl-flat"
        />
        <label htmlFor={id} className="tgl-btn" />
        <span className="tgl-lbl">
          <span>{t('settings.preferences.disabled')}</span>
          <span>{t('settings.preferences.enabled')}</span>
        </span>
      </div>
    </View>
  )
}
const { padding } = vars
styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding * 0.5,
    paddingBottom: padding * 0.5,
  },
})

export default Toggle
