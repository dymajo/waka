import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Consist from './Consist.jsx'

const TripInfo = ({ trip }) => {
  // console.log(trip)
  const [toggle, settoggle] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => settoggle(!toggle)}>
        {toggle ? 'close' : 'open'}
      </button>
      {toggle && (
        <div>
          <h6>extra info</h6>
          <div>
            {trip.speed && <div>Speed {trip.speed}</div>}
            {trip.bearing && <div>Bearing {trip.bearing}</div>}
            {trip.extraInfo && trip.extraInfo.vehicle_model && (
              <div>{trip.extraInfo.vehicle_model}</div>
            )}
            {trip.extraInfo && trip.extraInfo.air_conditioned && (
              <div>air conditioned</div>
            )}
            {trip.extraInfo && trip.extraInfo.run && (
              <div>Run: {trip.extraInfo.run}</div>
            )}
            {trip.extraInfo && trip.extraInfo.stop_id && (
              <div>Near: {trip.extraInfo.stop_id}</div>
            )}
            {trip.extraInfo && trip.extraInfo.cars && trip.extraInfo.type && (
              <div>
                {trip.extraInfo.cars} Car {trip.extraInfo.type}
              </div>
            )}
            {trip.extraInfo && trip.extraInfo.consist && (
              <Consist consist={trip.extraInfo.consist} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

TripInfo.propTypes = {}

export default TripInfo
