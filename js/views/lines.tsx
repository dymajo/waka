import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'
import SearchSwitch from './searchswitch.tsx'

declare function require(name: string): any;
let request = require('reqwest')

interface IAppProps extends React.Props<Lines>{
}

interface LineData {
    [key: string]: Array<Array<string>> 
}

interface IAppState{
    service?: string,
    allLines?: LineData
}

class Lines extends React.Component<IAppProps, IAppState>{
    constructor(props){
        super(props)
        this.state = {
            service: '',
            allLines: undefined
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

    public componentDidMount() {
        request(`/a/lines`).then((res)=>{
            console.log(res)
            this.setState({
                allLines: res
            })           
        })
    }


    public render() {
        var ret
        // there needs to be a sorting function in here probably
        if (this.props.children === null) {
            ret = []
            for (var key in this.state.allLines) {
                var el = this.state.allLines[key]
                if (el[0].length === 1) {
                    ret.push(<div key={key}><Link to={'/l/'+key}><strong>{key}</strong> {el[0][0]}</Link></div>)
                } else {
                    ret.push(<div key={key}><Link to={'/l/'+key}><strong>{key}</strong> {el[0][0]} to {el[0][1]}</Link></div>)
                }
                
            }
        } else {
            ret = this.props.children
        }
        return(
            <div>
                <input value={this.state.service} type="text" placeholder="Enter Service Name" onChange={this.triggerChange} /><br/>
                <button onClick={this.viewLine(this.state.service)}>View Line</button>
                Your line: 
                {ret}
                <SearchSwitch />
            </div>
        )
    }
}

export default Lines