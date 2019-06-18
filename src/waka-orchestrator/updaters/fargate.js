/* eslint-disable promise/prefer-await-to-callbacks */
const AWSXRay = require('aws-xray-sdk')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const logger = require('../logger.js')

class Fargate {
  constructor(config) {
    const { subnets, cluster, taskDefinition, securityGroups, region } = config
    if (!(subnets && cluster && taskDefinition && securityGroups)) {
      logger.warn('Cannot use Fargate Importer - Missing Config.')
      return
    }

    this.cluster = cluster
    this.taskDefinition = taskDefinition
    this.securityGroups = securityGroups
    this.subnets = subnets
    this.ecs = new AWS.ECS({ region })
  }

  startTask(environment) {
    if (!this.ecs) {
      logger.warn('Cannot start task - missing config.')
      return
    }
    const { cluster, taskDefinition, securityGroups, subnets, ecs } = this
    const params = {
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
        containerOverrides: [{ name: 'waka-importer', environment }],
      },
    }
    logger.debug({ params }, 'Task Parameters')
    ecs.runTask(params, (err, data) => {
      if (err) {
        logger.error({ err }, 'Could not start task.')
        return
      }
      logger.debug({ data })
      logger.info({ taskArn: data.tasks[0].taskArn }, 'Started Task')
    })
  }
}
module.exports = Fargate
