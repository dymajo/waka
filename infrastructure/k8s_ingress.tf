resource "kubernetes_ingress" "waka" {
  metadata {
    name      = "waka"
    namespace = var.namespace
    annotations = {
      "kubernetes.io/ingress.class" = "nginx"
    }
  }

  spec {
    rule {
      host = var.host_header
      http {
        path {
          backend {
            service_name = kubernetes_service.waka.metadata.0.name
            service_port = kubernetes_service.waka.spec.0.port.0.port
          }

          path = "/"
        }

        path {
          backend {
            service_name = "waka-proxy"
            service_port = 80
          }

          path = "/a"
        }

        path {
          backend {
            service_name = "waka-worker-nz-akl"
            service_port = 80
          }

          path = "/a/nz-akl"
        }

        path {
          backend {
            service_name = "waka-worker-nz-chc"
            service_port = 80
          }

          path = "/a/nz-chc"
        }

        path {
          backend {
            service_name = "waka-worker-nz-wlg"
            service_port = 80
          }

          path = "/a/nz-wlg"
        }
      }
    }
  }
}
