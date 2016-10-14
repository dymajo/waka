import * as React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'


declare function require(name: string): any;
let Clipboard = require('clipboard')
let request = require('reqwest')

interface IPinProps extends React.Props<Pin> {}
interface IPinState {
  email?: string,
  copied?: boolean,
  hide?: boolean
  emailSent?: boolean
}

let clipboard = undefined
class Pin extends React.Component<IPinProps, IPinState> {
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
  public componentDidMount() {
    clipboard = new Clipboard('.clipboardcopy');
  }
  public componentWillUnmount() {
    clipboard.destroy()
  }
  public triggerClose() {
    this.setState({
      hide: true
    } as IPinState)

    setTimeout(function() {
      browserHistory.push('/')
    }, 400)
  }
  public triggerClipboard() {
    if (this.state.copied) {
      this.triggerClose()
    } else {
      this.setState({
        copied: true
      } as IPinState)
    }
  }
  public doNothing(e) {
    e.preventDefault()
  }

  public sendEmail(e){
    e.preventDefault()
    console.log(this.state.email)
  }

  private triggerChange(e) {
    this.setState({
      email: e.currentTarget.value
    } as IPinState)
  }
  public render() {
    var userAgent = window.navigator.userAgent.toLowerCase()
    var output = <div className="other">
      <p>We don't know what browser you're using. 😕😕😕</p>
      <button className="primary" onClick={this.triggerClose}>Maybe next time.</button>
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
          <button className="primary clipboardcopy" data-clipboard-text="https://transit.dymajo.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
        </div>
      } else if (/safari/.test(userAgent)) {
        output = <div className="ios-safari">
          <p>Tap the <img src="/icons/ios-share.png" alt="share" /> button, then tap <strong>add to home screen</strong>.</p>
          <button className="primary" onTouchTap={this.triggerClose}>Thanks!</button>
        </div>
      // yeah so chrome and ff both identy themselves as safari like wtf
      } else {
        output = <div className="ios-other">
          <p>You’ll need to open this app in Safari first!</p>
          <p><a href="https://transit.dymajo.com" onClick={this.doNothing}>transit.dymajo.com</a></p>
          <button className="primary clipboardcopy" data-clipboard-text="https://transit.dymajo.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
        </div>
      }
    }
    if (/android/.test(userAgent)) {
      if (/firefox/.test(userAgent) || /samsung/.test(userAgent)) {
        output = <div className="android-other">
          <p>You’ll need to open this page in Chrome first!</p>
          <button className="primary clipboardcopy" data-clipboard-text="https://transit.dymajo.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
        </div>
      } else {
        output = <div className="android-chrome">
          <p>Tap the <img src="/icons/android-menu.png" alt="share" /> button, then tap <strong>add to home screen</strong>.</p>
          <button className="primary" onTouchTap={this.triggerClose}>Thanks!</button>
        </div>
      }
    }
    if (/edge/.test(userAgent)) {
      output = <div className="windows-edge">
        <p>Tap the dots button, then tap <strong>pin to start</strong>.</p>
        <button className="primary" onTouchTap={this.triggerClose}>Thanks!</button>
      </div>
    }

    var className = 'pincontainer'
    if (this.state.hide) {
      className += ' hide'
    }
    return(
      <div className={className}>
        <div className="mobile">
          {output}
        </div>
        <div className="desktop">
        <h3>Email yourself a link</h3>
          <form onSubmit={this.sendEmail}>
            <input value={this.state.email} type="email" placeholder="Email Address" onChange={this.triggerChange}/><br/>
            <button className="primary" type="submit">Send Link</button>
            <button onClick={this.triggerClose}>Close</button>
          </form>
        </div>       
      </div>
    )
  }
}
export default Pin