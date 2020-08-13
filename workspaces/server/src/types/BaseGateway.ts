import { WorkerConfig } from '../types'

export default abstract class BaseGateway {
  abstract start(prefix: string, config: WorkerConfig): Promise<void>
  abstract recycle(prefix: string, config: WorkerConfig): Promise<void>
  abstract stop(prefix: string): Promise<void>
}
