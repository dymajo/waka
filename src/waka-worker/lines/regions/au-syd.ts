import BaseLines, { BaseLinesProps } from '../../../types/BaseLines'

class LinesAUSYD extends BaseLines {
  constructor(props: BaseLinesProps) {
    super(props)

    this.lineIcons = {}
    this.lineColors = {}
    this.allLines = {}
    this.lineGroups = []
    this.lineOperators = {}
    this.friendlyNames = {}
  }

  async getLines() {
    const { logger, dataAccess } = this
    const allLines: {
      [routeShortName: string]: string[][]
    } = {}
    const lineOperators: { [routeShortName: string]: string } = {}
    const trainLineGroups: {
      name: string
      items: {
        routeId: string
        routeShortName: string
        routeLongName: string
        agencyId: string
        routeColor: string
        directionId: number
      }[]
    }[] = [
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
      { name: 'Other Trains', items: [] },
    ]
    const lineGroups: {
      name: string
      items: {
        routeId: string
        routeShortName: string
        routeLongName: string
        agencyId: string
        routeColor: string
      }[]
    }[] = [
      { name: 'Metro', items: [] },
      { name: 'Ferries', items: [] },
      { name: 'Light Rail', items: [] },
      { name: 'NSW TrainLink', items: [] },
      { name: 'Other', items: [] },
    ]
    const busLineGroups: {
      name: string
      items: {
        routeId: string
        routeShortName: string
        routeLongName: string
        agencyId: string
        routeColor: string
      }[]
    }[] = [
      { name: '100 series - Northern Beaches', items: [] },
      { name: '200 series - Northern Districts and North Shore', items: [] },
      { name: '300 series - East', items: [] },
      { name: '400 series - Inner West and South', items: [] },
      { name: '500 series - North West', items: [] },
      { name: '600 series - West and Hills District', items: [] },
      { name: '700 series - Outer West and Hills District', items: [] },
      { name: '800 series - Outer South-West', items: [] },
      { name: '900 series - St George/Sutherland and South West', items: [] },
      { name: 'Bus Rapid Transit', items: [] },
      { name: 'Metrobus', items: [] },
      { name: 'Express Buses', items: [] },
      { name: 'Limited Stop Buses', items: [] },
      { name: 'Shopper Buses', items: [] },
      { name: 'Night Buses', items: [] },
      { name: 'Other Sydney Buses', items: [] },
      { name: 'Blue Mountains Buses', items: [] },
      { name: 'Central Coast Buses', items: [] },
      { name: 'Hunter Buses', items: [] },
      { name: 'Illawarra Buses', items: [] },
      { name: 'Other Buses', items: [] },
    ]
    const notrains = await dataAccess.getRoutes(true)
    notrains.recordset.forEach(record => {
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
        agency_id: agencyId,
      } = record

      const routeColor = `#${record.route_color}`
      if (Object.prototype.hasOwnProperty.call(allLines, routeShortName)) {
        allLines[routeShortName].push(lineEntry)
      } else {
        allLines[routeShortName] = [lineEntry]
        this.lineColors[routeShortName] = routeColor
      }
      const [MET, FER, LRT, NTL, OTH] = lineGroups

      if (routeType === 700) {
        const isNumber = Number(routeShortName)
        const numRSN = parseInt(routeShortName.replace(/\D/g, ''), 10)
        const letterRSN = routeShortName.replace(/\d/g, '')
        if (routeDesc === 'Sydney Buses Network') {
          if (isNumber) {
            if (numRSN >= 100 && numRSN <= 199) {
              busLineGroups[0].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 200 && numRSN <= 299) {
              busLineGroups[1].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 300 && numRSN <= 399) {
              busLineGroups[2].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 400 && numRSN <= 499) {
              busLineGroups[3].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 500 && numRSN <= 599) {
              busLineGroups[4].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 600 && numRSN <= 699) {
              busLineGroups[5].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 700 && numRSN <= 799) {
              busLineGroups[6].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 800 && numRSN <= 899) {
              busLineGroups[7].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (numRSN >= 900 && numRSN <= 999) {
              busLineGroups[8].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else {
              busLineGroups[15].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            }
          } else if (letterRSN.length === 1) {
            if (letterRSN[0] === 'B') {
              busLineGroups[9].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (letterRSN[0] === 'M') {
              busLineGroups[10].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (letterRSN[0] === 'X' || letterRSN[0] === 'E') {
              busLineGroups[11].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (letterRSN[0] === 'L') {
              busLineGroups[12].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (letterRSN[0] === 'S') {
              busLineGroups[13].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else if (letterRSN[0] === 'N') {
              busLineGroups[14].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            } else {
              busLineGroups[15].items.push({
                routeColor,
                routeId,
                routeShortName,
                routeLongName,
                agencyId,
              })
            }
          } else {
            busLineGroups[15].items.push({
              routeColor,
              routeId,
              routeShortName,
              routeLongName,
              agencyId,
            })
          }
        } else if (routeDesc === 'Blue Mountains Buses Network') {
          busLineGroups[16].items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
          })
        } else if (routeDesc === 'Central Coast Buses Network') {
          busLineGroups[17].items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
          })
        } else if (routeDesc === 'Hunter Buses Network') {
          busLineGroups[18].items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
          })
        } else if (routeDesc === 'Illawarra Buses Network') {
          busLineGroups[19].items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
          })
        } else {
          busLineGroups[20].items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
          })
        }
      } else if (routeType === 4) {
        FER.items.push({
          routeColor,
          routeId,
          routeShortName,
          routeLongName,
          agencyId,
        })
      } else if (routeType === 0) {
        LRT.items.push({
          routeColor,
          routeId,
          routeShortName,
          routeLongName,
          agencyId,
        })
      } else if (routeType === 106 || routeType === 204) {
        NTL.items.push({
          routeColor,
          routeId,
          routeShortName,
          routeLongName,
          agencyId,
        })
      } else if (routeType === 401) {
        MET.items.push({
          routeColor,
          routeId,
          routeLongName,
          routeShortName,
          agencyId,
        })
      } else {
        OTH.items.push({
          routeColor,
          routeId,
          routeShortName,
          routeLongName,
          agencyId,
        })
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
    const trains = await dataAccess.getTrainRoutes()
    trains.recordset.forEach(record => {
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
        agency_id: agencyId,
        direction_id: directionId,
      } = record

      const routeColor = `#${record.route_color}`
      if (Object.prototype.hasOwnProperty.call(allLines, routeShortName)) {
        allLines[routeShortName].push(lineEntry)
      } else {
        allLines[routeShortName] = [lineEntry]
        this.lineColors[routeShortName] = routeColor
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
        OTHTR,
      ] = trainLineGroups
      if (routeType === 2) {
        if (routeShortName === 'T1') {
          T1.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T2') {
          T2.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T3') {
          T3.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T4') {
          T4.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T5') {
          T5.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T6') {
          T6.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T7') {
          T7.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T8') {
          T8.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'T9') {
          T9.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'BMT') {
          BMT.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'CCN') {
          CCN.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'HUN') {
          HUN.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'SCO') {
          SCO.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else if (routeShortName === 'SHL') {
          SHL.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        } else {
          OTHTR.items.push({
            routeColor,
            routeId,
            routeShortName,
            routeLongName,
            agencyId,
            directionId,
          })
        }
      }
    })
    this.allLines = allLines
    this.lineOperators = lineOperators
    this.lineGroupsV2 = [...trainLineGroups, ...lineGroups, ...busLineGroups]
  }
}

export default LinesAUSYD
