import React from 'react'

const variants = [
  // TRAINS
  ['EAST', 2],
  ['ONE', 2],
  ['STH', 2],
  ['WEST', 2],
  ['PUK', 2],

  // CITY
  ['CTY', 1],
  ['INN', 2],

  // ISTHMUS
  ['OUT', 2],
  ['005', 2],
  ['007', 2],
  ['008', 2],
  ['009', 2],
  ['010', 2],
  ['011', 2],
  ['020', 2],
  ['030', 2],
  ['209', 2],
  ['220', 2],
  ['221', 2],
  ['222', 2],
  ['223', 2],
  ['224', 2],
  ['233', 2],
  ['243', 2],
  ['243X', 2],
  ['246', 2],
  ['248', 2],
  ['248X', 2],
  ['249', 2],
  ['255', 4],
  ['258', 4],
  ['258X', 2],
  ['267', 4],
  ['267X', 2],
  ['274', 2],
  ['277', 2],
  ['299', 2],
  ['302', 2],
  ['309', 2],
  ['309X', 2],
  ['31X', 2],
  ['312', 2],
  ['321', 2],
  ['322', 2],
  ['390', 2],
  // NORTH OF MOTORWAY ISTHMUS
  ['605', 2],
  ['606', 2],
  ['625', 2],
  ['635', 2],
  ['645', 2],
  ['655', 2],
  ['703', 2],
  ['715', 2],
  ['719', 2],
  ['745', 2],
  ['756', 2],
  ['757', 2],
  ['767', 2],
  ['769', 2],
  ['770', 2],
  ['771', 2],

  ['500', 2],
  ['501', 2],
  ['500', 2],
  ['501', 2],
  ['515', 2],
  ['525', 2],
  ['532', 2],
  ['545', 2],
  ['550', 2],
  ['551', 2],
  ['552', 2],
  ['565', 2],
  ['575', 2],
  ['580', 2],
  ['589', 2],
  ['595', 2],

  ['31', 2],
  ['313', 2],
  ['314', 2],
  ['32', 2],
  ['324', 2],
  ['325', 2],
  ['326', 2],
  ['33', 2],
  ['352', 2],
  ['353', 2],
  ['360X', 2],
  ['361', 2],
  ['362', 2],
  ['363', 1],
  ['365', 2],
  ['366', 2],
  ['368', 1],
  ['369', 1],
  ['371', 2],
  ['372', 1],
  ['373', 2],
  ['374', 1],
  ['376', 2],
  ['377', 2],
  ['378', 1],
  ['380', 2],
  ['391', 1],
  ['392', 1],
  ['393', 1],
  ['394', 2],
  ['395', 2],
  ['396', 2],
  ['398', 2],
  ['399', 2],
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