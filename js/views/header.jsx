import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'

import { UiStore } from '../stores/uiStore.js'
import BackIcon from '../../dist/icons/back.svg'

// not used for all headers yet...
class Header extends React.Component {
  static propTypes = {
    history: PropTypes.object,
    title: PropTypes.string,
    backFn: PropTypes.func,
    className: PropTypes.string,
  }
  triggerBack = () => {
    UiStore.goBack(this.props.history, '/')
  }
  render() {
    const className = 'material-header ' + (this.props.className || '')
    return (
      <header className={className}>
        <span
          className="header-left"
          onTouchTap={this.props.backFn || this.triggerBack}
        >
          <BackIcon />
        </span>
        <div className="header-content">
          <h1 className="full-height">{this.props.title}</h1>
        </div>
      </header>
    )
  }
}
const HeaderWithRouter = withRouter(Header)
export default HeaderWithRouter
