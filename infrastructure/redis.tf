resource "kubernetes_deployment" "redis" {
  metadata {
    name      = "redis"
    namespace = var.namespace
    labels = {
      app = "redis"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "redis"
      }
    }

    template {
      metadata {
        labels = {
          app = "redis"
        }
      }

      spec {
        container {
          image = "redis:5-alpine"
          name  = "redis"

          env {
            name  = "ENDPOINT"
            value = var.endpoint
          }

          resources {
            limits {
              cpu    = "100m"
              memory = "32Mi"
            }
            requests {
              cpu    = "50m"
              memory = "16Mi"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec.0.replicas
    ]
  }
}

resource "kubernetes_service" "redis" {
  metadata {
    name      = "redis"
    namespace = var.namespace
  }
  spec {
    selector = {
      app = kubernetes_deployment.redis.metadata.0.labels.app
    }
    port {
      port        = 6379
      target_port = 6379
    }
    type = "ClusterIP"
  }
}
