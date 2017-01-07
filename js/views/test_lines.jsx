import React from 'react'

const variants = [
  // TRAINS
  ['EAST', 2],
  ['ONE', 2],
  ['STH', 2],
  ['WEST', 2],

  // CITY
  ['CTY', 1],
  ['INN', 2],

  // ISTHMUS
  ['OUT', 2],
  ['007', 2],
  ['008', 2],
  ['009', 2],
  ['010', 2],
  ['011', 2],
  ['233', 2],
  ['255', 4],
  ['258', 4],
  ['267', 4],
  ['274', 2],
  ['277', 2]
]

class TestLines extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      results: []
    }
    this.test = this.test.bind(this)
  }
  componentDidMount() {
    this.test()
  }
  test() {
    let test = (index) => {
      let route = variants[index]
      fetch('/a/line/'+route[0]).then((res) => {
        res.json().then((data) => {
          // return at the end
          let results = this.state.results.slice()
          route[2] = data.length
          results.push(route)
          this.setState({
            results: results
          })
          
          if (index+1 === variants.length) {
            return
          }
          test(index+1)
        })
      })
    }
    test(0)
  }
  render() {
    return (
      <div className="settingsContainer http-not-found">
        <div className="settings">
          <div>This tests to ensure all the lines have the proper number of variants.</div>
          <div>
            {this.state.results.map((item, key) => {
              let testString = 'success! ' + item[2] + ' lines'
              if (item[1] !== item[2]) {
                testString = `fail! ${item[2]}/${item[1]} lines`
              }
              return (
                <div key={key}><strong>{item[0]}</strong> {testString}</div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
}
export default TestLines