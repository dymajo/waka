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
        automount_service_account_token = "true"
        container {
          image = "dymajo/waka-server:proxy-${jsondecode(data.http.git_sha.body).commit.sha}"
          name  = "waka-proxy"

          env {
            name  = "ENDPOINT"
            value = var.endpoint
          }

          liveness_probe {
            http_get {
              path = "/a/ping"
              port = "80"
            }
            initial_delay_seconds = 3
            period_seconds        = 3
          }

          readiness_probe {
            http_get {
              path = "/a/ping"
              port = "80"
            }
            initial_delay_seconds = 3
            period_seconds        = 3
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

