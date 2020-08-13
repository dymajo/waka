data "aws_iam_policy_document" "api_service" {
  statement {
    sid = "WriteAccessToCloudWatch"

    actions = [
      "cloudwatch:PutMetricData",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents",
    ]

    resources = ["*"]
  }

  statement {
    sid = "WriteAccessToS3"

    actions = [
      "s3:PutObject"
    ]

    resources = var.s3_bucket_arn
  }

  statement {
    sid = "DynamoAccess"

    actions = ["dynamodb:*"]

    resources = var.dynamo_arn
  }
}
