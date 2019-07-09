import Connection from '../waka-worker/db/connection'
import DataAccess from '../waka-worker/lines/dataAccess'
import { Logger } from '../typings'

export interface BaseLinesProps {
  logger: Logger
  connection: Connection
}

export default abstract class BaseLines {
  getColors: any
  abstract start(): void
  logger: Logger
  connection: Connection
  dataAccess: any
  lineIcons: any
  lineColors: any
  allLines: any
  lineGroups: any
  lineOperators: any
  friendlyNames: any
  constructor(props: BaseLinesProps) {
    const { logger, connection } = props
    this.logger = logger
    this.connection = connection
    this.dataAccess = new DataAccess({ connection })
  }
}