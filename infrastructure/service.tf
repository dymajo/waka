resource "aws_ecs_service" "api_service" {
  name            = var.name
  cluster         = var.ecs_cluster_name
  task_definition = aws_ecs_task_definition.api_service.arn
  desired_count   = 2
  iam_role        = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  load_balancer {
    target_group_arn = aws_alb_target_group.api_service_tg.arn
    container_name   = var.name
    container_port   = 80
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:mutating !exists or attribute:mutating != true"
  }
}
