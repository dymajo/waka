resource "kubernetes_deployment" "waka" {
  metadata {
    name      = "waka"
    namespace = var.namespace
    labels = {
      app = "waka"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "waka"
      }
    }

    template {
      metadata {
        labels = {
          app = "waka"
        }
        annotations = {
          # "linkerd.io/inject" = "enabled"
        }
      }

      spec {
        automount_service_account_token = "true"
        container {
          image = "dymajo/waka:${jsondecode(data.http.git_sha.body).commit.sha}"
          name  = "waka"

          env {
            name  = "ASSETSPREFIX"
            value = var.assetsprefix
          }
          env {
            name  = "ENDPOINT"
            value = var.endpoint
          }

          env {
            name = "AWS_REGION"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.api_service.metadata.0.name
                key  = "AWS_DEFAULT_REGION"
              }
            }
          }

          env {
            name = "AWS_ACCESS_KEY_ID"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.api_service.metadata.0.name
                key  = "AWS_ACCESS_KEY_ID"
              }
            }
          }


          env {
            name = "AWS_SECRET_ACCESS_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.api_service.metadata.0.name
                key  = "AWS_SECRET_ACCESS_KEY"
              }
            }
          }

          env {
            name  = "FEEDBACK_SNS_TOPIC_ARN"
            value = aws_sns_topic.feedback_notifications.arn
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

          port {
            container_port = 80
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


