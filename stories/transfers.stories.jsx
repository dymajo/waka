import React from 'react'

import { storiesOf } from '@storybook/react'
import Transfers from '../js/views/lines/Transfers'

storiesOf('Transfers', module)
  .add('no transfers', () => (
    <Transfers currentLine={1} transfers={[[1, '#fff']]} />
  ))
  .add('1 transfers', () => (
    <Transfers currentLine={1} transfers={[[1, '#fff'], [2, '#000']]} />
  ))
  .add('many transfers', () => (
    <Transfers
      currentLine={1}
      transfers={[[1, '#fff'], [2, '#000'], [3, '#777']]}
    />
  ))
