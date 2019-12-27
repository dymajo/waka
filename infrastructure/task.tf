resource "aws_ecs_task_definition" "waka-importer" {
  family                   = "linux-${var.name}"
  container_definitions    = local.container_definition
  cpu                      = 512
  memory                   = 1024
  network_mode             = "awsvpc"
  task_role_arn            = aws_iam_role.api_service.arn
  execution_role_arn       = aws_iam_role.api_service.arn
  requires_compatibilities = ["FARGATE"]
}

resource "aws_cloudwatch_log_group" "api_service" {
  name              = "/aws/ecs/${var.name}"
  retention_in_days = 7
  tags              = var.tags
}

locals {
  container_definition = <<DEFINITION
[
  {
    "name": "waka-importer",
    "image": "dymajo/waka-importer:${jsondecode(data.http.git_sha.body).commit.sha}",
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-region": "${data.aws_region.current.name}",
        "awslogs-group": "/aws/ecs/${var.name}",
        "awslogs-stream-prefix": "waka"
      }
    }
  }
]
DEFINITION
}
