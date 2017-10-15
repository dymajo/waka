import React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'
import Clipboard from 'clipboard'
import local from '../../local'

let clipboard = undefined
class Pin extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      email: '',
      copied: false,
      hide: false,
      emailSent: false
    }
    this.triggerClose = this.triggerClose.bind(this)
    this.triggerClipboard = this.triggerClipboard.bind(this)
    this.sendEmail = this.sendEmail.bind(this)
    this.triggerChange = this.triggerChange.bind(this)
  }
  componentDidMount() {
    clipboard = new Clipboard('.clipboardcopy');
  }
  componentWillUnmount() {
    clipboard.destroy()
  }
  triggerClose(e) {
    if (e) {
      e.preventDefault()
    }
    
    this.setState({
      hide: true
    })

    setTimeout(() => {
      this.props.onHide()
    }, 400)
  }
  triggerClipboard() {
    if (this.state.copied) {
      this.triggerClose()
    } else {
      this.setState({
        copied: true
      })
    }
  }
  doNothing(e) {
    e.preventDefault()
  }

  sendEmail(e){
    e.preventDefault()
    fetch(`${local.endpoint}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: this.state.email
      })
    })
    this.setState({
      emailSent: true
    })
  }
  triggerChange(e) {
    this.setState({
      email: e.currentTarget.value
    })
  }
  render() {
    var userAgent = window.navigator.userAgent.toLowerCase()
    var output = <div className="other">
      <p>We don't know what browser you're using. 😕😕😕</p>
      <button className="nice-button primary" onTouchTap={this.triggerClose}>Maybe next time.</button>
    </div>
    var linktext = 'Copy Link'
    if (this.state.copied) {
      linktext = 'Copied!'
    }
    if (iOS.detect()) {
      // jfc why is everything a uawebview in ios
      if (/crios/.test(userAgent) || /fxios/.test(userAgent) ||
          /fbios/.test(userAgent) || /twitter/.test(userAgent)) {
        output = <div className="ios-other">
          <p>You’ll need to open this app in Safari first!</p>
          <button className="nice-button primary clipboardcopy" data-clipboard-text="https://getwaka.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
          <br /><br />
        </div>
      } else if (/safari/.test(userAgent)) {
        output = <div className="ios-safari">
          <p>Tap the <img src="/icons/ios-share.png" alt="share" /> button, then tap <strong>add to home screen</strong>.</p>
          <button className="nice-button primary" onTouchTap={this.triggerClose}>Thanks!</button>
        </div>
      // yeah so chrome and ff both identy themselves as safari like wtf
      } else {
        output = <div className="ios-other">
          <p>You’ll need to open this app in Safari first!</p>
          <p><a href="https://getwaka.com" onClick={this.doNothing}>getwaka.com</a></p>
          <button className="nice-button primary clipboardcopy" data-clipboard-text="https://getwaka.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
        </div>
      }
    }
    if (/android/.test(userAgent)) {
      if (/firefox/.test(userAgent) || /samsung/.test(userAgent)) {
        output = <div className="android-other">
          <p>You’ll need to open this page in Chrome first!</p>
          <button className="nice-button primary clipboardcopy" data-clipboard-text="https://getwaka.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
        </div>
      } else {
        output = <div className="android-chrome">
          <p>Tap the <img src="/icons/android-menu.png" alt="share" /> button, then tap <strong>add to home screen</strong>.</p>
          <button className="nice-button primary" onTouchTap={this.triggerClose}>Thanks!</button>
        </div>
      }
    }
    if (/edge/.test(userAgent)) {
      output = <div className="windows-edge">
        <p>Tap the dots button, then tap <strong>pin to start</strong>.</p>
        <button className="nice-button primary" onTouchTap={this.triggerClose}>Thanks!</button>
      </div>
    }

    var className = 'pincontainer'
    if (this.state.hide) {
      className += ' hide'
    }
    var desktopOut = ''
    if (!this.state.emailSent) {     
      desktopOut = <div>
        <h3>Email yourself a link to Waka!</h3>
        <form onSubmit={this.sendEmail}>
          <input value={this.state.email} type="email" placeholder="Email Address" onChange={this.triggerChange}/><br/>
          <button className="nice-button primary" type="submit">Send Link</button> <button className="nice-button" onClick={this.triggerClose}>Cancel</button>
        </form>
      </div>
    } else {
      desktopOut = <div>
        <h3>Thanks! You should receive an email shortly.</h3>
        <button onTouchTap={this.triggerClose}>Close</button>
      </div>
    }
    return(
      <div className={className}>
        <div className="mobile">
          {output}
        </div>
        <div className="desktop">
          {desktopOut}
        </div>       
      </div>
    )
  }
}
export default Pin