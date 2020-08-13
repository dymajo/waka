import { AppsV1Api, KubeConfig } from '@kubernetes/client-node'
import { KubernetesGatewayConfig, WorkerConfig } from '../../types'
import BaseGateway from '../../types/BaseGateway'
import logger from '../logger'
import EnvMapper from '../../envMapper'

// this is a bit gross because the swagger codegen in the client library doesn't know about this header
const STRATEGIC_HEADERS = {
  'content-type': 'application/strategic-merge-patch+json',
}

class GatewayKubernetes extends BaseGateway {
  k8sApi: AppsV1Api
  namespace: string
  deploymentPrefix: string
  deploymentSuffix: string
  containerName: String
  replicas: number
  envMapper: EnvMapper

  constructor(config: KubernetesGatewayConfig) {
    super()
    const {
      namespace,
      deploymentPrefix,
      deploymentSuffix,
      containerName,
      replicas,
    } = config || {}
    this.namespace = namespace || 'default'
    this.deploymentPrefix = deploymentPrefix || 'waka-worker-'
    this.deploymentSuffix = deploymentSuffix || ''
    this.containerName = containerName || 'waka-worker'
    this.replicas = replicas || 1

    logger.info('Using Kubernetes Gateway')

    const kc = new KubeConfig()
    kc.loadFromDefault()
    this.k8sApi = kc.makeApiClient(AppsV1Api)
    this.envMapper = new EnvMapper()
  }

  async start(prefix: string, config: WorkerConfig) {
    const {
      deploymentPrefix,
      deploymentSuffix,
      namespace,
      replicas,
      containerName,
      k8sApi,
    } = this
    const { version } = config
    const headers = STRATEGIC_HEADERS
    const deploymentName = [deploymentPrefix, prefix, deploymentSuffix].join('')

    try {
      await k8sApi.readNamespacedDeployment(deploymentName, namespace)
    } catch (error) {
      if (error.response.statusCode === 404) {
        logger.error(
          { namespace, deploymentName, prefix, version },
          'Could not find Deployment - please create it on the cluster, or modify gatewayConfig.kubernetes.deploymentPrefix & gatewayConfig.kubernetes.deploymentSuffix in the admin page.'
        )
      } else {
        logger.error(
          { error, namespace, deploymentName, prefix, version },
          'Could not get Deployment'
        )
      }
      return // don't do anything if there's an error
    }

    // makes config docker friendly
    const envMap = this.envMapper.toEnvironmental(config, 'worker')
    const env = Object.keys(envMap).map(name => ({
      name,
      value: (envMap[name] || '').toString(),
    }))
    logger.debug({ prefix, env: envMap }, 'Environmental Variables')

    try {
      await k8sApi.patchNamespacedDeployment(
        deploymentName,
        namespace,
        {
          spec: {
            replicas,
            template: {
              spec: {
                containers: [
                  {
                    name: containerName,
                    env,
                  },
                ],
              },
            },
          },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        { headers }
      )
      logger.info(
        { namespace, deploymentName, prefix, version },
        'Updated Deployment'
      )
    } catch (error) {
      logger.error(
        { error, namespace, deploymentName, prefix, version },
        'Could not update Deployment'
      )
    }
  }

  async stop(prefix: string) {
    const { deploymentPrefix, deploymentSuffix, namespace, k8sApi } = this
    const deploymentName = [deploymentPrefix, prefix, deploymentSuffix].join('')
    const headers = STRATEGIC_HEADERS

    logger.info({ namespace, deploymentName, prefix }, 'Scaling replicas to 0')
    try {
      await k8sApi.patchNamespacedDeploymentScale(
        deploymentName,
        namespace,
        {
          spec: {
            replicas: 0,
          },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        { headers }
      )
      logger.info({ namespace, deploymentName, prefix }, 'Scaled Deployment')
    } catch (error) {
      logger.error(
        { error, namespace, deploymentName, prefix },
        'Could not update Deployment'
      )
    }
  }

  async recycle(prefix: string) {
    const { deploymentPrefix, deploymentSuffix, namespace, k8sApi } = this
    const deploymentName = [deploymentPrefix, prefix, deploymentSuffix].join('')
    const headers = STRATEGIC_HEADERS

    try {
      // this is how `kubectl rollout restart` works
      await k8sApi.patchNamespacedDeployment(
        deploymentName,
        namespace,
        {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                },
              },
            },
          },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        { headers }
      )
      logger.info({ namespace, deploymentName, prefix }, 'Restarted Deployment')
    } catch (error) {
      logger.error(
        { error, namespace, deploymentName, prefix },
        'Could not restart Deployment'
      )
    }
  }
}
export default GatewayKubernetes
