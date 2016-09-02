import * as React from 'react'
import { Link, browserHistory } from 'react-router'

interface IAppProps extends React.Props<Splash> {}

class Splash extends React.Component<IAppProps, {}> {
  public render() {

    return (
      <div>
        <h2>Transit</h2>
        <p>This is an app for Auckland Transport. But we're not assoicated with Auckland Transport. Don't even think that for a second.</p>
        <p>A thing made by <a href="https://twitter.com/consindo">Jono Cooper</a> &amp; <a href="https://twitter.com/MattDavidosn">Matt Davidson</a>.
          This app is open source - contributions are welcome! <a href="https://github.com/consindo/at-realtime">https://github.com/consindo/at-realtime</a></p>
        <p>&copy; 2016 DYMAJO Ltd. Made in <a style={{cursor:'default',color:'#000',textDecoration:'none'}} href="#" title="The best city in the world.">Auckland, New Zealand</a>.</p>
      </div>
    )
  }
}
export default Splash