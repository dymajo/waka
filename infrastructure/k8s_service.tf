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
