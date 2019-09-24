resource "aws_ecs_task_definition" "api_service" {
  family                = "linux-${var.name}"
  container_definitions = local.container_definition
  task_role_arn         = aws_iam_role.api_service.arn
  network_mode          = "bridge"
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
    "name": "${var.name}",
    "image": "dymajo/waka:${jsondecode(data.http.git_sha.body).commit.sha}",
    "essential": true,
    "memory": 32,
    "portMappings": [
      {
        "containerPort": 80,
        "hostPort": 0
      }
    ],
    "environment": [
      {
        "name": "ASSETSPREFIX",
        "value": "${var.assetsprefix}"
      },
      {
        "name": "ENDPOINT",
        "value": "${var.endpoint}"
      }
    ]
  }
]
DEFINITION
}
