/* eslint-disable promise/prefer-await-to-callbacks */
import AWS from 'aws-sdk'
import { EnvironmentImporterConfig } from '../../types'
import logger from '../logger'

class Fargate {
  cluster: string
  taskDefinition: string
  securityGroups: string[]
  subnets: string[]
  ecs: AWS.ECS
  constructor(config) {
    const { subnets, cluster, taskDefinition, securityGroups, region } = config
    if (!(subnets && cluster && taskDefinition && securityGroups)) {
      logger.warn('Cannot use Fargate Importer - Missing Config.')
      return
    }
    logger.info('Using Fargate Importer')

    this.cluster = cluster
    this.taskDefinition = taskDefinition
    this.securityGroups = securityGroups
    this.subnets = subnets
    this.ecs = new AWS.ECS({ region })
  }

  async startTask(env: EnvironmentImporterConfig) {
    if (!this.ecs) {
      logger.warn('Cannot start task - missing config.')
      return
    }

    const ecsEnvironment = Object.keys(env).map(name => ({
      name,
      value: (env[name] || '').toString(),
    }))

    const { cluster, taskDefinition, securityGroups, subnets, ecs } = this
    const params: AWS.ECS.RunTaskRequest = {
      taskDefinition,
      cluster,
      count: 1,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets,
          securityGroups,
          assignPublicIp: 'ENABLED', // otherwise there is no route to the internet
        },
      },
      overrides: {
        containerOverrides: [{ name: 'waka-importer', environment: ecsEnvironment }],
      },
    }
    logger.debug({ params }, 'Task Parameters')
    try {
      const data = await ecs.runTask(params).promise()
      logger.debug({ data })
      logger.info({ taskArn: data.tasks[0].taskArn }, 'Started Task')
    } catch (error) {
      logger.error({ error }, 'Could not start task.')
    }
  }
}
export default Fargate
