import * as React from 'react'

interface IAppProps extends React.Props<Search> {}

class Search extends React.Component<IAppProps, {}> {
  public render() {
    return (
      <div>Search</div>
    )
  }
}
export default Search