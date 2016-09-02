import * as React from 'react'
import { Link, browserHistory } from 'react-router'

interface IAppProps extends React.Props<NoMatch> {}

class NoMatch extends React.Component<IAppProps, {}> {
  public render() {

    return (
      <div>
        <h2>Not Found</h2>
      </div>
    )
  }
}
export default NoMatch