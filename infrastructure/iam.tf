resource "aws_iam_role" "api_service" {
  name = "ecs-${var.name}-${data.aws_region.current.name}"

  assume_role_policy = data.aws_iam_policy_document.api_service_assume.json
}

data "aws_iam_policy_document" "api_service_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "api_service" {
  name        = "ecs-${var.name}-${data.aws_region.current.name}"
  description = "Allow write to CloudWatch"
  path        = "/"
  policy      = data.aws_iam_policy_document.api_service.json
}

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
}

resource "aws_iam_role_policy_attachment" "api_service" {
  role       = aws_iam_role.api_service.name
  policy_arn = aws_iam_policy.api_service.arn
}
