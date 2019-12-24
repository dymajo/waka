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

resource "kubernetes_service" "default-backend" {
  metadata {
    name      = "default-backend"
    namespace = var.namespace
  }
  spec {
    type          = "ExternalName"
    external_name = "sfo2-k8s.dymajo.com"
  }
}
