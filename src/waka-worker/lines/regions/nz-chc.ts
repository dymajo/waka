import BaseLines, { BaseLinesProps } from '../../../types/BaseLines'
import { parseRoutes } from '../helpers'

class LinesNZCHC extends BaseLines {
  lineIcons = {
    B: 'nz/metro-blue',
    O: 'nz/metro-orange',
    Oa: 'nz/metro-orbiter',
    Oc: 'nz/metro-orbiter',
    P: 'nz/metro-purple',
    Y: 'nz/metro-yellow',
    F: 'nz/metro-ferry',
  }
  
  async getLines() {
    const { logger, dataAccess } = this
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
      {
        name: 'Frequent',
        items: [],
      },
      {
        name: 'Connector',
        items: [],
      },
    ]

    const [
      frequent,
      connector
    ] = lineGroups

    const routesData = await dataAccess.getRoutes()
    const {
      routes,
      allLines,
      friendlyNumbers,
      lineOperators,
      lineColors,
    } = parseRoutes(routesData, this.friendlyNames)
    routes
      .filter(routeItem => routeItem.duplicate === false)
      .forEach(routeItem => {
        const { routeShortName } = routeItem
        delete routeItem.routeType
        delete routeItem.duplicate

        const routeLongNameComponents = routeItem.routeLongName.trim().split(' ')
        console.log(routeLongNameComponents)
        if (!isNaN(parseInt(routeLongNameComponents[0], 10))) {
          routeItem.routeLongName = routeLongNameComponents.slice(1).join(' ')
        }

        const numericLine = parseInt(routeShortName, 10)
        if (numericLine < 85 || isNaN(numericLine)) {
          frequent.items.push(routeItem)
        } else {
          connector.items.push(routeItem)
        }
      })

    this.lineGroups = lineGroups.map(group => ({
      name: group.name,
      items: group.items.map(i => [i.agencyId, i.routeShortName].join('/')),
    }))
    this.lineGroupsV2 = lineGroups.filter(group => group.items.length !== 0)
    this.lineOperators = lineOperators
    this.friendlyNumbers = friendlyNumbers
    this.allLines = allLines
    this.lineColors = lineColors

    logger.info('Cached Lines')
  }
}
export default LinesNZCHC
