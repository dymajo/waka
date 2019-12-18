resource "kubernetes_ingress" "waka" {
  metadata {
    name        = "waka"
    namespace   = var.namespace
    annotations = {
      "kubernetes.io/ingress.class" = "nginx"
    }
  }

  spec {
    backend {
      service_name = kubernetes_service.waka.metadata.0.name
      service_port = kubernetes_service.waka.spec.0.port.0.port
    }
  }
}
