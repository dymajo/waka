resource "kubernetes_service" "waka" {
  metadata {
    name      = "waka"
    namespace = var.namespace
  }
  spec {
    selector = {
      app = kubernetes_deployment.waka.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 80
    }
    type = "ClusterIP"
  }
}
