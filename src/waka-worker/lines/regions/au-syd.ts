import DataAccess from '../dataAccess'
import Connection from '../../db/connection'
import BaseLines, { BaseLinesProps } from '../../../types/BaseLines'

class LinesAUSYD extends BaseLines {
  constructor(props: BaseLinesProps) {
    super(props)

    this.lineIcons = {}
    this.lineColors = {}
    this.allLines = {}
    this.lineGroups = {}
    this.lineOperators = {}
    this.friendlyNames = {}
  }

  async start() {
    await this.getLines()
  }

  async getLines() {
    const { logger, dataAccess } = this
    const allLines = {}
    const lineOperators = {}
    const lineGroups = [
      { name: 'T1 North Shore & Western', items: [] },
      { name: 'T2 Inner West & Leppington', items: [] },
      { name: 'T3 Bankstown', items: [] },
      { name: 'T4 Eastern Suburbs & Illawarra', items: [] },
      { name: 'T5 Cumberland', items: [] },
      { name: 'T6 Carlingford', items: [] },
      { name: 'T7 Olympic Park', items: [] },
      { name: 'T8 Airport & South', items: [] },
      { name: 'T9 Northern', items: [] },
      { name: 'Blue Mountains', items: [] },
      { name: 'Central Coast & Newcastle', items: [] },
      { name: 'Hunter', items: [] },
      { name: 'South Coast', items: [] },
      { name: 'Southern Highlands', items: [] },
      { name: 'Other', items: [] },
      { name: 'Buses', items: [] },
      { name: 'Ferries', items: [] },
      { name: 'Light Rail', items: [] },
      { name: 'NSW TrainLink', items: [] },
    ]
    const result = await dataAccess.getRoutes()
    result.recordset.forEach(record => {
      lineOperators[record.route_short_name] = record.agency_id
      const splitName = record.route_long_name
        .replace(/^\d+\W+/, '')
        .split(' - ')
      const viaSplit = (splitName[1] || '').split('via')
      const lineEntry = [splitName[0]]
      if (viaSplit.length > 1) {
        lineEntry.push(viaSplit[0])
        lineEntry.push(viaSplit[1])
      } else if (splitName.length === 2) {
        lineEntry.push(splitName[1])
      }
      const {
        route_type: routeType,
        route_short_name: routeShortName,
        route_desc: routeDesc,
        route_id: routeId,
        route_long_name: routeLongName,
        route_color: routeColor,
      } = record
      if (routeShortName === 'HUN') {
      }

      if (Object.prototype.hasOwnProperty.call(allLines, routeShortName)) {
        allLines[routeShortName].push(lineEntry)
      } else {
        allLines[routeShortName] = [lineEntry]
        this.lineColors[routeShortName] = `#${routeColor}`
      }
      const [
        T1,
        T2,
        T3,
        T4,
        T5,
        T6,
        T7,
        T8,
        T9,
        BMT,
        CCN,
        HUN,
        SCO,
        SHL,
        OTH,
        BUS,
        FER,
        LRT,
        NTL,
      ] = lineGroups
      if (routeType === 400) {
        if (routeShortName === 'T1') {
          T1.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T2') {
          T2.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T3') {
          T3.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T4') {
          T4.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T5') {
          T5.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T6') {
          T6.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T7') {
          T7.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T8') {
          T8.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'T9') {
          T9.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'BMT') {
          BMT.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'CCN') {
          CCN.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'HUN') {
          HUN.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'SCO') {
          SCO.items.push({ routeId, routeShortName, routeLongName })
        } else if (routeShortName === 'SHL') {
          SHL.items.push({ routeId, routeShortName, routeLongName })
        } else {
          OTH.items.push({ routeId, routeShortName, routeLongName })
        }
      }

      if (routeType === 700 && routeDesc !== 'School Buses') {
        BUS.items.push(routeShortName)
      }
      if (routeType === 1000) {
        FER.items.push(routeShortName)
      }

      if (routeType === 900) {
        LRT.items.push(routeShortName)
      }
      if (routeType === 106 || routeType === 204) {
        NTL.items.push(routeShortName)
      }

      const numericLine = parseInt(routeShortName, 10)

      // lineGroups.forEach(group => {
      //   // this sorts text names before numbers
      //   group.items.sort((a, b) => {
      //     const parsedA = parseInt(a, 10)
      //     const parsedB = parseInt(b, 10)
      //     if (isNaN(parsedA) && isNaN(parsedB)) return a.localeCompare(b)
      //     if (isNaN(parsedA)) return -1
      //     if (isNaN(parsedB)) return 1
      //     return parsedA - parsedB
      //   })
      // })
    })
    this.allLines = allLines
    this.lineOperators = lineOperators
    this.lineGroups = lineGroups
  }
}

export default LinesAUSYD
