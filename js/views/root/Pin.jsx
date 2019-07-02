import React from 'react'
import PropTypes from 'prop-types'
import Clipboard from 'clipboard'
import iOS from '../../helpers/ios.js'
import local from '../../../local'

let deferredPrompt = null
window.addEventListener('beforeinstallprompt', e => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault()
  // Stash the event so it can be triggered later.
  deferredPrompt = e
})

let clipboard
class Pin extends React.Component {
  static propTypes = {
    onHide: PropTypes.func,
  }

  state = {
    email: '',
    copied: false,
    hide: false,
    emailSent: false,
  }

  async componentDidMount() {
    clipboard = new Clipboard('.clipboardcopy')

    if (deferredPrompt !== null) {
      // Show the prompt
      deferredPrompt.prompt()
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt')
      } else {
        console.log('User dismissed the A2HS prompt')
      }
      this.triggerClose()
      deferredPrompt = null
    }
  }

  componentWillUnmount() {
    clipboard.destroy()
  }

  triggerClose = e => {
    if (e) {
      e.preventDefault()
    }

    this.setState({
      hide: true,
    })

    setTimeout(() => {
      this.props.onHide()
    }, 400)
  }

  triggerClipboard = () => {
    if (this.state.copied) {
      this.triggerClose()
    } else {
      this.setState({
        copied: true,
      })
    }
  }

  doNothing(e) {
    e.preventDefault()
  }

  sendEmail = e => {
    e.preventDefault()
    fetch(`${local.endpoint}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.state.email,
      }),
    })
    this.setState({
      emailSent: true,
    })
  }

  triggerChange = e => {
    this.setState({
      email: e.currentTarget.value,
    })
  }

  render() {
    if (deferredPrompt !== null) {
      return null
    }
    const userAgent = window.navigator.userAgent.toLowerCase()
    let output = (
      <div className="other">
        <p>We don't know what browser you're using. 😕😕😕</p>
        <button className="nice-button primary" onClick={this.triggerClose}>
          Maybe next time.
        </button>
      </div>
    )
    let linktext = 'Copy Link'
    if (this.state.copied) {
      linktext = 'Copied!'
    }
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
            <button className="nice-button primary" onClick={this.triggerClose}>
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
              <a href="https://waka.app" onClick={this.doNothing}>
                waka.app
              </a>
            </p>
            <button
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
    if (/android/.test(userAgent)) {
      if (/firefox/.test(userAgent) || /samsung/.test(userAgent)) {
        output = (
          <div className="android-other">
            <p>You’ll need to open this page in Chrome first!</p>
            <button
              className="nice-button primary clipboardcopy"
              data-clipboard-text="https://getwaka.com"
              onClick={this.triggerClipboard}
            >
              {linktext}
            </button>
          </div>
        )
      } else {
        output = (
          <div className="android-chrome">
            <p>
              Tap the <img src="/icons/android-menu.png" alt="share" /> button,
              then tap <strong>add to home screen</strong>.
            </p>
            <button className="nice-button primary" onClick={this.triggerClose}>
              Thanks!
            </button>
          </div>
        )
      }
    }
    if (/edge/.test(userAgent)) {
      output = (
        <div className="windows-edge">
          <p>
            Tap the dots button, then tap <strong>pin to start</strong>.
          </p>
          <button className="nice-button primary" onClick={this.triggerClose}>
            Thanks!
          </button>
        </div>
      )
    }

    let className = 'pincontainer'
    if (this.state.hide) {
      className += ' hide'
    }
    let desktopOut = ''
    if (!this.state.emailSent) {
      desktopOut = (
        <div>
          <h3>Email yourself a link to Waka!</h3>
          <form onSubmit={this.sendEmail}>
            <input
              value={this.state.email}
              type="email"
              placeholder="Email Address"
              onChange={this.triggerChange}
            />
            <br />
            <button className="nice-button primary" type="submit">
              Send Link
            </button>
            <button className="nice-button" onClick={this.triggerClose}>
              Cancel
            </button>
          </form>
        </div>
      )
    } else {
      desktopOut = (
        <div>
          <h3>Thanks! You should receive an email shortly.</h3>
          <button onClick={this.triggerClose}>Close</button>
        </div>
      )
    }
    return (
      <div className={className}>
        <div className="mobile">{output}</div>
        <div className="desktop">{desktopOut}</div>
      </div>
    )
  }
}

export default Pin
