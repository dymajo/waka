import BaseLines, { BaseLinesProps } from '../../../types/BaseLines'

class OtagoLines extends BaseLines {
  constructor(props: BaseLinesProps) {
    super(props)
    this.lineColors = {}
    this.lineGroups = [
      {
        name: 'Tāhuna, Queenstown',
        items: [],
      },
      {
        name: 'Ōtepoti, Dunedin',
        items: [],
      },
    ]
    this.allLines = {}
    this.lineOperators = {}
  }

  start = async () => {
    await this.getLines()
  }

  agencyFilter = (line: string) => {
    line = line.toLowerCase()
    if (line.length > 3 && line.substring(0, 3) === 'qtn') {
      return 'QTN'
    }
    return null
  }

  getColor = (agency: string, line: string) => {
    const { lineColors } = this
    if (agency === 'QTN') {
      return lineColors[`QTN${line}`] || '#000'
    }
    return lineColors[line] || '#000'
  }

  getLines = async () => {
    const {
      dataAccess,
      allLines,
      lineColors,
      friendlyNumbers,
      lineGroups,
    } = this
    const result = await dataAccess.getRoutes()

    result.recordset.forEach(record => {
      const route_code_prefix =
        record.agency_id === 'ORC' ? '' : record.agency_id
      const route_code = route_code_prefix + record.route_short_name
      if (!(route_code in allLines)) {
        allLines[route_code] = [[record.route_long_name]]
        lineColors[route_code] = `#${record.route_color.toLowerCase()}`

        if (route_code !== record.route_short_name) {
          friendlyNumbers[route_code] = record.route_short_name
        }

        if (route_code_prefix === '') {
          lineGroups[1].items.push(route_code)
        } else {
          lineGroups[0].items.push(route_code)
        }
      } else {
        allLines[route_code].push([record.route_long_name])
      }
    })
  }
}

export default OtagoLines
