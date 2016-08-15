import * as React from 'react'

interface IAppProps extends React.Props<Station> {
  routeParams: {
    station: String
  }
}

class Station extends React.Component<IAppProps, {}> {
  public render() {
    return (
      <div>
        <header>
          <div>
            <span className="icon">🚆</span>
            <h1>Britomart</h1>
            <h2>Britomart Train Station, Auckland Central</h2>
          </div>
        </header>
        
      </div>
    )
  }
}
export default Station