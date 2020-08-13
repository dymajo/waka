/* eslint-disable promise/prefer-await-to-callbacks */

import AWS from 'aws-sdk'
import EnvMapper from '../../envMapper'
import { EcsGatewayConfig, WorkerConfig } from '../../types'
import BaseGateway from '../../types/BaseGateway'
import logger from '../logger'

const envConvert = (env: any) =>
  JSON.stringify(
    env.map((e: { name: string; value: any }) => `${e.name}|${e.value}`).sort()
  )

class GatewayEcs extends BaseGateway {
  servicePrefix: string
  serviceSuffix: string
  replicas: number
  envMapper: EnvMapper
  ecs: AWS.ECS

  constructor(config: EcsGatewayConfig) {
    super()
    const { cluster, region, servicePrefix, serviceSuffix, replicas } = config || {}
    this.servicePrefix = servicePrefix || ''
    this.serviceSuffix = serviceSuffix || ''
    this.replicas = replicas || 1
    this.envMapper = new EnvMapper()

    if (!(region && cluster)) {
      logger.warn('Cannot use ECS Gateway - Missing Config.')
      return
    }

    logger.info('Using ECS Gateway')

    this.ecs = new AWS.ECS({ region, params: { cluster } })
  }

  async start(prefix: string, config: WorkerConfig) {
    const { ecs, servicePrefix, serviceSuffix, replicas } = this
    if (!ecs) {
      logger.error({ prefix }, 'Cannot start ECS Service - not configured.')
      return
    }
    logger.info({ prefix }, 'Starting ECS Service')

    // makes config docker friendly
    const env = this.envMapper.toEnvironmental(config, 'worker')
    const envArray = Object.keys(env).map(name => ({
      name,
      value: (env[name] || '').toString(),
    }))
    logger.debug({ prefix, env }, 'Environmental Variables')
    const serviceName = `${servicePrefix}${prefix}${serviceSuffix}`

    try {
      // describe service
      const services = await ecs
        .describeServices({ services: [serviceName] })
        .promise()

      logger.debug({ prefix, services }, 'Service Info')
      const service = services.services[0]

      // describe task definition
      const taskDefinitionArn = service.taskDefinition.split(':')
      // removes the version qualifer to get latest
      taskDefinitionArn.splice(-1)
      const taskDefinition = await ecs
        .describeTaskDefinition({
          taskDefinition: taskDefinitionArn.join(':'),
        })
        .promise()
      let newTaskDefinitionArn = taskDefinition.taskDefinition.taskDefinitionArn
      logger.debug({ prefix, taskDefinition }, 'Task Definition Info')

      // determine if task definitions needs update
      const containerDefinition =
        taskDefinition.taskDefinition.containerDefinitions[0]

      // in theory, if terraform revises the memory or cpu
      // it's going to leave the environment variables clean
      // so this should still pick up changes.
      if (
        envConvert(envArray) === envConvert(containerDefinition.environment)
      ) {
        logger.info({ prefix }, 'Environmental variables have not changed.')
      } else {
        logger.info(
          { prefix },
          'Environmental variables have changed - updating task definition.'
        )

        // update task defintion - new envs
        // delete keys that fail validation
        containerDefinition.environment = envArray
        delete taskDefinition.taskDefinition.compatibilities
        delete taskDefinition.taskDefinition.requiresAttributes
        delete taskDefinition.taskDefinition.revision
        delete taskDefinition.taskDefinition.status
        delete taskDefinition.taskDefinition.taskDefinitionArn

        const newTaskDefinition = await ecs
          .registerTaskDefinition(taskDefinition.taskDefinition)
          .promise()
        newTaskDefinitionArn =
          newTaskDefinition.taskDefinition.taskDefinitionArn
        logger.info({ prefix, newTaskDefinitionArn }, 'Task defintion updated.')
      }

      // update service if needed - logging
      if (service.taskDefinition !== newTaskDefinitionArn) {
        logger.info({ prefix }, 'New Task Definition - updating service.')
      }
      if (service.desiredCount !== replicas) {
        logger.info(
          {
            prefix,
            wantedReplicas: replicas,
            actualReplicas: service.desiredCount,
          },
          'Service desired count does not match configuration - updating service.'
        )
      }

      // update service if needed
      if (
        service.taskDefinition !== newTaskDefinitionArn ||
        service.desiredCount !== replicas
      ) {
        await ecs
          .updateService({
            service: service.serviceName,
            taskDefinition: newTaskDefinitionArn,
            desiredCount: replicas,
          })
          .promise()
        logger.info(
          { prefix, service: service.serviceName },
          'ECS service updated.'
        )
      } else {
        logger.info(
          { prefix, service: service.serviceName },
          'No updates required.'
        )
      }

      // done
      // wow. just realized this is the same logic as a powershell script I wrote
      // that allows Octopus Deploy to deploy to ECS
    } catch (err) {
      logger.error({ err, serviceName }, 'Could not start ECS Service.')
    }
  }

  async recycle(prefix: string) {
    const { ecs, servicePrefix, serviceSuffix, replicas } = this
    const serviceName = `${servicePrefix}${prefix}${serviceSuffix}`

    await ecs.updateService({
      service: serviceName,
      forceNewDeployment: true,
      desiredCount: replicas,
    })
    logger.info({ prefix, service: serviceName }, 'ECS Service Updated')
  }

  async stop(prefix: string) {
    const { ecs, servicePrefix, serviceSuffix } = this
    if (!ecs) {
      logger.error({ prefix }, 'Cannot stop ECS Service - not configured.')
      return
    }
    const serviceName = `${servicePrefix}${prefix}${serviceSuffix}`
    logger.info(
      { prefix, service: serviceName },
      'Scaling ECS Worker Service to 0.'
    )

    // scale service to 0
    await ecs
      .updateService({
        service: serviceName,
        desiredCount: 0,
      })
      .promise()
    logger.info({ prefix, service: serviceName }, 'ECS service stopped.')

    // done
  }
}
export default GatewayEcs
