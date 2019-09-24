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

data "aws_lb" "alb" {
  name = "${var.load_balancer_name}"
}

data "aws_lb_listener" "https_listener" {
  load_balancer_arn = "${data.aws_lb.alb.arn}"
  port = 443
}

resource "aws_alb_listener_rule" "api_service_https_listener" {
  listener_arn = data.aws_lb_listener.https_listener.arn

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.api_service_tg.id
  }

  condition {
    field  = "host-header"
    values = ["${var.host_header}"]
  }
}
