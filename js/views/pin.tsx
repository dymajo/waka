import * as React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'

declare function require(name: string): any;
let Clipboard = require('clipboard')

interface IPinProps extends React.Props<Pin> {}
interface IPinState {
  copied: boolean
}

let clipboard = undefined
class Pin extends React.Component<IPinProps, IPinState> {
  constructor(props) {
    super(props)
    this.state = {
      copied: false
    }
    this.triggerClipboard = this.triggerClipboard.bind(this)
  }
  public componentDidMount() {
    clipboard = new Clipboard('.clipboardcopy');
  }
  public componentWillUnmount() {
    clipboard.destroy()
  }
  public triggerClose() {
    browserHistory.push('/')
  }
  public triggerClipboard() {
    if (this.state.copied) {
      this.triggerClose()
    } else {
      this.setState({
        copied: true
      })
    }
  }
  public doNothing(e) {
    e.preventDefault()
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
          <p>You'll need to open this app in Safari first!</p>
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
          <p>You'll need to open this app in Safari first!</p>
          <p><a href="https://transit.dymajo.com" onClick={this.doNothing}>transit.dymajo.com</a></p>
          <button className="primary clipboardcopy" data-clipboard-text="https://transit.dymajo.com" onTouchTap={this.triggerClipboard}>{linktext}</button>
        </div>
      }
    }
    if (/android/.test(userAgent)) {
      if (/firefox/.test(userAgent) || /samsung/.test(userAgent)) {
        output = <div className="android-other">
          <p>You'll need to open this page in Chrome first!</p>
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
    return(
      <div className="pincontainer">
        {output}
      </div>
    )
  }
}
export default Pin