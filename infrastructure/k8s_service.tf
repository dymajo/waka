resource "kubernetes_service" "waka-proxy" {
  metadata {
    name      = "waka-proxy"
    namespace = var.namespace
  }
  spec {
    selector = {
      app = kubernetes_deployment.waka-proxy.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 80
    }
    type = "ClusterIP"
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
