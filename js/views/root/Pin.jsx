import React, { Component } from 'react'
import { func } from 'prop-types'
import Clipboard from 'clipboard'
import iOS from '../../helpers/ios.js'

let deferredPrompt = null
window.addEventListener('beforeinstallprompt', e => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault()
  // Stash the event so it can be triggered later.
  deferredPrompt = e
})

let clipboard
class Pin extends Component {
  static propTypes = {
    onHide: func,
  }

  constructor(props) {
    super(props)
    this.state = {
      copied: false,
      hide: false,
    }
  }

  async componentDidMount() {
    clipboard = new Clipboard('.clipboardcopy')

    if (deferredPrompt !== null) {
      // Show the prompt
      deferredPrompt.prompt()
      // Wait for the user to respond to the prompt
      await deferredPrompt.userChoice
      this.triggerClose()
      deferredPrompt = null
    }
  }

  componentWillUnmount() {
    clipboard.destroy()
  }

  triggerClose = e => {
    const { onHide } = this.props
    if (e) {
      e.preventDefault()
    }

    this.setState({
      hide: true,
    })

    setTimeout(() => {
      onHide()
    }, 400)
  }

  triggerClipboard = () => {
    const { copied } = this.state
    if (copied) {
      this.triggerClose()
    } else {
      this.setState({
        copied: true,
      })
    }
  }

  render() {
    if (deferredPrompt !== null) {
      return null
    }
    const userAgent = window.navigator.userAgent.toLowerCase()
    let output = (
      <div className="other">
        <p>We don’t know what browser you’re using. 😕😕😕</p>
        <button
          type="button"
          className="nice-button primary"
          onClick={this.triggerClose}
        >
          Maybe next time.
        </button>
      </div>
    )

    const { copied, hide } = this.state
    const linktext = copied ? 'Copied!' : 'Copy Link'
    if (iOS.detect()) {
      // jfc why is everything a uawebview in ios
      if (
        /crios/.test(userAgent) ||
        /fxios/.test(userAgent) ||
        /fbios/.test(userAgent) ||
        /twitter/.test(userAgent)
      ) {
        output = (
          <div className="ios-other">
            <p>You’ll need to open this app in Safari first!</p>
            <button
              type="button"
              className="nice-button primary clipboardcopy"
              data-clipboard-text="https://waka.app"
              onClick={this.triggerClipboard}
            >
              {linktext}
            </button>
            <br />
            <br />
          </div>
        )
      } else if (/safari/.test(userAgent)) {
        output = (
          <div className="ios-safari">
            <p>
              Tap the <img src="/icons/ios-share.png" alt="share" /> button,
              then tap <strong>add to home screen</strong>.
            </p>
            <button
              type="button"
              className="nice-button primary"
              onClick={this.triggerClose}
            >
              Thanks!
            </button>
          </div>
        )
        // yeah so chrome and ff both identy themselves as safari like wtf
      } else {
        output = (
          <div className="ios-other">
            <p>You’ll need to open this app in Safari first!</p>
            <p>
              <a href="https://waka.app" onClick={e => e.preventDefault()}>
                waka.app
              </a>
            </p>
            <button
              type="button"
              className="nice-button primary clipboardcopy"
              data-clipboard-text="https://waka.app"
              onClick={this.triggerClipboard}
            >
              {linktext}
            </button>
          </div>
        )
      }
    }

    return (
      <div className={hide ? 'pincontainer hide' : 'pincontainer'}>
        {output}
      </div>
    )
  }
}

export default Pin
