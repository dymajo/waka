resource "aws_alb_target_group" "api_service_tg" {
  name                 = "${var.name}-tg"
  vpc_id               = var.vpc_id
  port                 = 80
  protocol             = "HTTP"
  deregistration_delay = 120

  health_check {
    path = "/ping"
  }
}
