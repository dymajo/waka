data "aws_iam_policy_document" "api_service" {
  statement {
    sid = "PublishToSns"

    actions = [
      "sns:Publish",
    ]

    resources = [
      aws_sns_topic.feedback_notifications.arn
    ]
  }
}
