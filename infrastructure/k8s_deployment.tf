resource "kubernetes_deployment" "waka-proxy" {
  metadata {
    name      = "waka-proxy"
    namespace = var.namespace
    labels = {
      app = "waka-proxy"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "waka-proxy"
      }
    }

    template {
      metadata {
        labels = {
          app = "waka-proxy"
        }
        annotations = {
          "linkerd.io/inject" = "enabled"
        }
      }

      spec {
        container {
          image = "dymajo/waka-server:proxy-${jsondecode(data.http.git_sha.body).commit.sha}"
          name  = "waka-proxy"

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

  timeouts {
    create = "15m"
    update = "15m"
  }
}


