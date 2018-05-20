import React from 'react'

import moment from 'moment-timezone'

class Onzo extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    const updatedgmt = moment.tz(this.props.updated, 'Etc/GMT')
    const updated = updatedgmt.format('hh:mm a DD/MM/YYYY')
    return (
      <div style={{ textAlign: 'center' }}>
        Bike last seen: {updated}
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

export default Onzo
