import * as React from 'react'

interface IAppProps extends React.Props<Index> {}

class Index extends React.Component<IAppProps, {}> {
  public render() {
    return (
      <div>
        Real Time Board
        {this.props.children}
      </div>
    )
  }
}
export default Index