resource "aws_iam_user" "waka-orchestrator" {
  name = "waka-orchestrator-${var.environment}"
  path = "/digital-ocean/${data.aws_region.current.name}/"
}

resource "aws_iam_user_policy" "waka-orchestrator" {
  name   = "dynamo"
  user   = aws_iam_user.waka-orchestrator.name
  policy = data.aws_iam_policy_document.waka-orchestrator.json
}

data "aws_iam_policy_document" "waka-orchestrator" {
  statement {
    sid = "DynamoAccess"

    actions = [
      "dynamodb:*",
    ]

    resources = [
      aws_dynamodb_table.waka-meta.arn,
      aws_dynamodb_table.waka-mappings.arn,
      aws_dynamodb_table.waka-versions.arn,
    ]
  }
}

resource "aws_iam_access_key" "waka-orchestrator" {
  user = aws_iam_user.waka-orchestrator.name
}

resource "kubernetes_secret" "waka-orchestrator" {
  metadata {
    name      = "waka-orchestrator-${var.environment}-aws"
    namespace = var.namespace
  }

  data = {
    AWS_ACCESS_KEY_ID     = aws_iam_access_key.waka-orchestrator.id
    AWS_SECRET_ACCESS_KEY = aws_iam_access_key.waka-orchestrator.secret
    AWS_DEFAULT_REGION    = data.aws_region.current.name
  }
}

resource "kubernetes_service_account" "waka-orchestrator" {
  metadata {
    name      = "waka-orchestrator"
    namespace = var.namespace
  }
}

resource "kubernetes_role" "waka-orchestrator" {
  metadata {
    name      = "waka-orchestrator"
    namespace = var.namespace
  }

  rule {
    api_groups = [
      "",
      "apps",
      "autoscaling",
      "batch",
      "extensions",
      "policy",
      "networking.k8s.io",
      "rbac.authorization.k8s.io"
    ]
    resources = [
      "configmaps",
      "deployments",
      "deployments/scale",
      "events",
      "replicasets",
      "replicasets/scale",
      "replicationcontrollers",
      "pods",
      "pods/status",
      "jobs",
      "secrets"
    ]
    verbs = [
      "get",
      "list",
      "watch",
      "create",
      "update",
      "patch",
      "delete",
      "deletecollection"
    ]
  }
}

resource "kubernetes_role_binding" "waka-orchestrator" {
  metadata {
    name      = kubernetes_role.waka-orchestrator.metadata.0.name
    namespace = var.namespace
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.waka-orchestrator.metadata.0.name
    api_group = "rbac.authorization.k8s.io"
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.waka-orchestrator.metadata.0.name
    namespace = var.namespace
  }
}

resource "kubernetes_deployment" "waka-orchestrator" {
  metadata {
    name      = "waka-orchestrator"
    namespace = var.namespace
    labels = {
      app = "waka-orchestrator"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "waka-orchestrator"
      }
    }

    template {
      metadata {
        labels = {
          app = "waka-orchestrator"
        }
        annotations = {
          # "linkerd.io/inject" = "enabled"
        }
      }

      spec {
        automount_service_account_token = "true"
        service_account_name            = kubernetes_service_account.waka-orchestrator.metadata.0.name

        container {
          image = "dymajo/waka-server:orchestrator-${jsondecode(data.http.git_sha.body).commit.sha}"
          name  = "waka-orchestrator"

          env {
            name  = "GATEWAY"
            value = "kubernetes"
          }

          env {
            name  = "KEYVALUE"
            value = "dynamo"
          }

          env {
            name  = "KEYVALUE_PREFIX"
            value = "waka-${var.environment}-k8s"
          }

          env {
            name  = "KEYVALUE_REGION"
            value = data.aws_region.current.name
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.waka-orchestrator.metadata.0.name
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

          resources {
            limits {
              cpu    = "1000m"
              memory = "96Mi"
            }
            requests {
              cpu    = "100m"
              memory = "32Mi"
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

resource "kubernetes_service" "waka-orchestrator" {
  metadata {
    name      = "waka-orchestrator"
    namespace = var.namespace
  }
  spec {
    selector = {
      app = kubernetes_deployment.waka-orchestrator.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 80
    }
    type = "ClusterIP"
  }
}

