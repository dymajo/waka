resource "aws_iam_user" "api_service" {
  name = var.name
  path = "/digital-ocean/${data.aws_region.current.name}/"
}

resource "aws_iam_user_policy" "api_service" {
  name   = "dynamo_s3"
  user   = aws_iam_user.api_service.name
  policy = data.aws_iam_policy_document.api_service.json
}

resource "aws_iam_access_key" "api_service" {
  user = aws_iam_user.api_service.name
}

resource "kubernetes_secret" "api_service" {
  metadata {
    name      = "${var.name}-aws"
    namespace = var.namespace
  }

  data = {
    AWS_ACCESS_KEY_ID     = aws_iam_access_key.api_service.id
    AWS_SECRET_ACCESS_KEY = aws_iam_access_key.api_service.secret
    AWS_DEFAULT_REGION    = data.aws_region.current.name
  }
}
