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
      }

      spec {
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
            name  = "AWS_REGION"
            value = var.region
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


