import * as React from 'react'
import * as ReactDOM from 'react-dom'

interface IAppProps extends React.Props<App> {}

interface IAppState {
	name: String
}

class App extends React.Component<IAppProps, IAppState> {
	
	public state: IAppState

	constructor(props: IAppProps) {
		super(props)

		this.state = {
			name: 'Jono the Cooper'
		}
	}

	public render() {
		return (
			<div>
				{this.state.name} was finally able to create his Hello World React + Typescript App
			</div>
		)
	}
}
document.addEventListener("DOMContentLoaded", function(event) {
	ReactDOM.render(<App />, document.getElementById('app'))
})