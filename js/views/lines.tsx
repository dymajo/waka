import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

declare function require(name: string): any;
let request = require('reqwest')

interface IAppProps extends React.Props<Lines>{
}

interface IAppState{
    service?: string
}

class Lines extends React.Component<IAppProps, IAppState>{
    constructor(props){
        super(props)
        this.state={
            service: ""
        }
        this.triggerChange = this.triggerChange.bind(this)
    }
    
    public viewLine(line){
        return function() {
            browserHistory.push(`/l/${line}`)
        }
    }

    private triggerChange(e) {
        this.setState({
            service: e.currentTarget.value
        } as IAppState)
    }
    public render() {
        return(
            <div>
                <input value={this.state.service} type="text" placeholder="Enter Service Name" onChange={this.triggerChange} /><br/>
                <button onClick={this.viewLine(this.state.service)}>View Line</button>
                Your line: 
                {this.props.children}
            </div>
        )
    }
}

export default Lines