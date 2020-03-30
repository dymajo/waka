import React from 'react'
import { Text, StyleSheet } from 'react-native'

import { vars } from '../../../styles.js'

const { fontFamily } = vars

const styles = StyleSheet.create({
  transfers: {
    display: 'block',
    overflow: 'hidden',
    fontSize: 0,
    marginBottom: vars.padding * 0.25,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  transfer: {
    backgroundColor: '#222',
    color: '#fff',
    marginRight: 2,
    fontSize: vars.defaultFontSize - 4,
    lineHeight: vars.defaultFontSize - 4,
    fontFamily,
    fontWeight: '600',
    paddingLeft: 3,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: '3px',
    display: 'inline-block',
  },
})

const Transfers = props => {
  const { transfers, currentLine } = props
  return transfers.length <= 0 ? null : (
    <Text style={styles.transfers}>
      {transfers
        .filter(t => t[0] !== currentLine)
        .map(transfer => (
          <Text
            style={[styles.transfer, { backgroundColor: transfer[1] }]}
            key={transfer[0]}
          >
            {transfer[0]}
          </Text>
        ))}
    </Text>
  )
}

export default Transfers
