import React from 'react'

import { storiesOf } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { linkTo } from '@storybook/addon-links'

import Header from '../js/views/reusable/Header.jsx'
import SavedIcon from '../dist/icons/unsaved.svg'

storiesOf('Header', module)
  .add('single line', () => <Header title="Header Title" />)
  .add('with subtitle', () => (
    <Header title="Header Title" subtitle="This is the Header Subtitle" />
  ))
  .add('with icon', () => (
    <Header
      title="Header Title"
      subtitle="This is the Header Subtitle"
      actionIcon={<SavedIcon style={{ fill: '#666' }} />}
      actionFn={() => alert('button clicked')}
    />
  ))
  .add('no close button', () => (
    <Header
      title="Header Title"
      subtitle="This is the Header Subtitle"
      actionIcon={<SavedIcon style={{ fill: '#666' }} />}
      actionFn={() => alert('button clicked')}
      hideClose={true}
    />
  ))
