resource "aws_sns_topic" "feedback_notifications" {
  name = "${var.name}-feedback"
}
