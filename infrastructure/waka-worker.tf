variable "worker_regions" {
  description = "Map of Worker Regions"
  default = {
    "au-syd" = 1
    "nz-akl" = 1
    "nz-wlg" = 1
    "nz-chc" = 1
  }
}

resource "aws_iam_user" "waka-worker" {
  name = "waka-worker-${var.environment}"
  path = "/digital-ocean/${data.aws_region.current.name}/"
}

resource "aws_iam_user_policy" "waka-worker" {
  name   = "dynamo"
  user   = aws_iam_user.waka-worker.name
  policy = data.aws_iam_policy_document.waka-worker.json
}

data "aws_iam_policy_document" "waka-worker" {
  statement {
    sid     = "S3Access"
    actions = ["s3:GetObject"]
    resources = [
      "arn:aws:s3:::shapes-${data.aws_region.current.name}.waka.app/*",
      "arn:aws:s3:::test-shapes-${data.aws_region.current.name}.waka.app/*"
    ]
  }
}

resource "aws_iam_access_key" "waka-worker" {
  user = aws_iam_user.waka-worker.name
}

resource "kubernetes_secret" "waka-worker" {
  metadata {
    name      = "waka-worker-${var.environment}-aws"
    namespace = var.namespace
  }

  data = {
    AWS_ACCESS_KEY_ID     = aws_iam_access_key.waka-worker.id
    AWS_SECRET_ACCESS_KEY = aws_iam_access_key.waka-worker.secret
    AWS_DEFAULT_REGION    = data.aws_region.current.name
  }
}

resource "kubernetes_deployment" "waka-worker" {
  for_each = var.worker_regions
  metadata {
    name      = "waka-worker-${each.key}"
    namespace = var.namespace
    labels = {
      app    = "waka-worker"
      region = each.key
    }
  }

  spec {
    replicas = 0

    selector {
      match_labels = {
        app    = "waka-worker"
        region = each.key
      }
    }

    template {
      metadata {
        labels = {
          app    = "waka-worker"
          region = each.key
        }
        annotations = {
          "linkerd.io/inject" = "enabled"
        }
      }

      spec {
        automount_service_account_token = "true"
        container {
          image = "dymajo/waka-server:worker-${jsondecode(data.http.git_sha.body).commit.sha}"
          name  = "waka-worker"

          env_from {
            secret_ref {
              name = kubernetes_secret.waka-worker.metadata.0.name
            }
          }

          // TODO: liveness & readiness probes
          resources {
            limits {
              cpu    = "200m"
              memory = "96Mi"
            }
            requests {
              cpu    = "100m"
              memory = "64Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/ping"
              port = "80"
            }
            initial_delay_seconds = 3
            period_seconds        = 3
          }

          readiness_probe {
            http_get {
              path = "/ping"
              port = "80"
            }
            initial_delay_seconds = 3
            period_seconds        = 3
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec.0.replicas,
      spec.0.template.0.spec.0.container.0.env,
    ]
  }
}
