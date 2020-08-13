import { addParameters, configure } from '@storybook/react'
import theme from './theme.js'

// automatically import all files ending in *.stories.js
const req = require.context('../stories', true, /\.stories\.jsx$/)
const loadStories = () => {
  req.keys().forEach(filename => req(filename))
}

addParameters({
  options: {
    theme,
  },
})

configure(loadStories, module)
