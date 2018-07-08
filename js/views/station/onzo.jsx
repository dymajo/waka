import React from 'react'
import { View, Text, StyleSheet } from 'react-native-web'

// import moment from 'moment-timezone'
// moment is cancelled. it's only good for the serverside - brings in 1mb of JS

class Onzo extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    const updatedgmt = moment.tz(this.props.updated, 'Etc/GMT')
    const updated = updatedgmt.format('hh:mm a [-] DD/MM/YYYY')
    return (
      <div style={{ textAlign: 'center' }}>
        <View style={styles.onzoButton}>
          <Text style={styles.onzoHeader}>Last Seen</Text>
          <Text style={styles.onzoUpdated}>{updated}</Text>
        </View>

        <a
          className="nice-button secondary"
          href="https://twitter.com/search?q=onzo"
          target="_blank"
          rel="noopener"
        >
          Find Onzo on Twitter
        </a>
      </div>
    )
  }
}

const styles = StyleSheet.create({
  onzoButton: {
    backgroundColor: '#FFCC00',
    textAlign: 'left',
    padding: '10px',
    marginBottom: '20px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(0,0,0,0.25)',
  },
  onzoHeader: { color: 'black', fontSize: '36px', fontWeight: '600' },
  onzoUpdated: {},
})

export default Onzo
